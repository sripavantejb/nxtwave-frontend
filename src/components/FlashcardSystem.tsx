import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaClock, FaStar, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { renderText } from './renderText'
import Loader from './Loader'
import {
  fetchRandomFlashcardJson,
  submitFlashcardRating,
  fetchFollowUpQuestion,
  submitFlashcardAnswer,
  getNextQuestion,
  startFlashcardSession,
  type FlashcardData,
  type FollowUpQuestion,
  type SubmitResult
} from '../api/client'

// Helper function to get JWT token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || null
}

type FlashcardSystemProps = {
  className?: string
}

export default function FlashcardSystem({ className = '' }: FlashcardSystemProps) {
  const navigate = useNavigate()
  const [currentFlashcard, setCurrentFlashcard] = useState<FlashcardData | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [followUpQuestion, setFollowUpQuestion] = useState<FollowUpQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionSubtopics, setSessionSubtopics] = useState<string[]>([])
  const [completedSubtopics, setCompletedSubtopics] = useState<string[]>([])
  const [timerActive, setTimerActive] = useState(false)
  const [hasRated, setHasRated] = useState(false)

  // Check authentication and initialize session on mount
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    // Initialize session
    const initSession = async () => {
      setInitializing(true)
      try {
        const session = await startFlashcardSession(token)
        setSessionSubtopics(session.sessionSubtopics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize session')
      } finally {
        setInitializing(false)
      }
    }

    initSession()
  }, [navigate])

  // Load next flashcard with priority logic
  const loadFlashcard = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)
    setError(null)
    setShowAnswer(false)
    setRating(null)
    setDifficulty(null)
    setFollowUpQuestion(null)
    setSelectedOption(null)
    setSubmitResult(null)
    setTimeLeft(30)
    setTimerActive(true)
    setHasRated(false)

    try {
      // Priority 1: Check for due reviews
      try {
        const dueQuestion = await getNextQuestion(token)
        if (dueQuestion && 'flashcard' in dueQuestion) {
          setCurrentFlashcard(dueQuestion as FlashcardData)
          setLoading(false)
          return
        }
      } catch (err) {
        // No due reviews, continue to priority 2
      }

      // Priority 2: Get flashcard from session subtopics
      const data = await fetchRandomFlashcardJson(token)
      
      // Check if all subtopics are completed
      if ('allCompleted' in data && data.allCompleted) {
        // Start new session (force new session by passing force parameter)
        try {
          const newSession = await startFlashcardSession(token, true) // Force new session
          setSessionSubtopics(newSession.sessionSubtopics)
          setCompletedSubtopics([])
          // Try loading again with a small delay to ensure session is saved
          await new Promise(resolve => setTimeout(resolve, 100))
          const newData = await fetchRandomFlashcardJson(token)
          
          // Check if still all completed (shouldn't happen, but handle gracefully)
          if ('allCompleted' in newData && newData.allCompleted) {
            setError('All flashcards in new session are already completed. Please try again later.')
            return
          }
          
          if ('flashcard' in newData) {
            setCurrentFlashcard(newData as FlashcardData)
          } else {
            setError('No flashcards available in new session')
          }
        } catch (sessionErr) {
          console.error('Error starting new session:', sessionErr)
          setError('Failed to start new session. Please refresh the page.')
        }
      } else if ('flashcard' in data) {
        setCurrentFlashcard(data as FlashcardData)
      } else {
        setError('No flashcards available')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flashcard'
      const requiresSession = (err as any)?.requiresSession || errorMessage.includes('No active session') || errorMessage.includes('requiresSession')
      
      if (requiresSession) {
        // Try to start session and retry
        try {
          const token = getAuthToken()
          if (token) {
            const session = await startFlashcardSession(token)
            setSessionSubtopics(session.sessionSubtopics)
            // Retry loading flashcard
            const retryData = await fetchRandomFlashcardJson(token)
            if (retryData && 'flashcard' in retryData) {
              setCurrentFlashcard(retryData as FlashcardData)
              setLoading(false)
              return
            } else if (retryData && 'allCompleted' in retryData && retryData.allCompleted) {
              // All completed, start new session
              const newSession = await startFlashcardSession(token)
              setSessionSubtopics(newSession.sessionSubtopics)
              setCompletedSubtopics([])
              const newData = await fetchRandomFlashcardJson(token)
              if (newData && 'flashcard' in newData) {
                setCurrentFlashcard(newData as FlashcardData)
                setLoading(false)
                return
              }
            }
            setError('No flashcards available after starting session')
          } else {
            setError('Authentication required')
          }
        } catch (retryErr) {
          console.error('Retry error:', retryErr)
          setError(errorMessage)
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Initial load
  useEffect(() => {
    const token = getAuthToken()
    if (token && sessionSubtopics.length > 0) {
      loadFlashcard()
    }
  }, [sessionSubtopics.length, loadFlashcard])

  // Timer countdown - enforce 30 seconds
  useEffect(() => {
    if (!currentFlashcard || showAnswer || followUpQuestion || !timerActive || timeLeft <= 0) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-reveal answer when time runs out
          setShowAnswer(true)
          setTimerActive(false)
          // Auto-rate as 1 if user didn't rate
          if (!hasRated && rating === null) {
            handleAutoRate()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentFlashcard, showAnswer, followUpQuestion, timeLeft, timerActive, hasRated, rating])

  const loadFollowUpQuestion = useCallback(async (topicId: string, diff: string, subTopic?: string, flashcardQuestionId?: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }
      const data = await fetchFollowUpQuestion(topicId, diff, subTopic, token, flashcardQuestionId)
      setFollowUpQuestion(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-up question')
    }
  }, [])

  const handleAutoRate = useCallback(async () => {
    if (!currentFlashcard || hasRated) return
    
    setHasRated(true)
    setRating(1)
    await submitRating(1)
  }, [currentFlashcard, hasRated])

  const submitRating = useCallback(async (ratingValue: number) => {
    if (!currentFlashcard) return

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const data = await submitFlashcardRating(currentFlashcard.questionId, ratingValue, token)
      setDifficulty(data.difficulty)

      // Load follow-up question with subtopic and flashcard linkage
      await loadFollowUpQuestion(
        currentFlashcard.topicId,
        data.difficulty,
        currentFlashcard.subTopic,
        currentFlashcard.questionId
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    }
  }, [currentFlashcard, loadFollowUpQuestion])

  const handleRating = async (ratingValue: number) => {
    if (hasRated || !timerActive) return // Prevent rating after timeout
    
    setHasRated(true)
    setRating(ratingValue)
    setShowAnswer(true)
    setTimerActive(false)
    await submitRating(ratingValue)
  }

  const handleSubmitAnswer = async () => {
    if (!followUpQuestion || !selectedOption || !currentFlashcard) return

    setLoading(true)
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Authentication required to submit answers')
      }

      // Submit answer with flashcard context using the API client
      const data = await submitFlashcardAnswer(
        followUpQuestion.questionId,
        selectedOption,
        token,
        currentFlashcard.questionId,
        currentFlashcard.subTopic
      )
      
      setSubmitResult(data)

      // Mark subtopic as completed
      if (currentFlashcard.subTopic && !completedSubtopics.includes(currentFlashcard.subTopic)) {
        setCompletedSubtopics([...completedSubtopics, currentFlashcard.subTopic])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  const handleNextFlashcard = () => {
    loadFlashcard()
  }

  // Check authentication
  const token = getAuthToken()
  if (!token) {
    return (
      <div className={`flashcard-system ${className}`}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please log in to use flashcards</p>
          <button className="btn" onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (initializing) {
    return (
      <div className={`flashcard-system ${className}`}>
        <Loader message="Initializing flashcard session..." />
      </div>
    )
  }

  if (loading && !currentFlashcard) {
    return (
      <div className={`flashcard-system ${className}`}>
        <Loader message="Loading flashcard..." />
      </div>
    )
  }

  if (error && !currentFlashcard) {
    return (
      <div className={`flashcard-system ${className}`}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
          <p>{error}</p>
          <button className="btn" onClick={loadFlashcard} style={{ marginTop: '20px' }}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flashcard-system ${className}`}>
      {/* Session Progress */}
      {sessionSubtopics.length > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          background: '#f0f9ff', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
            Session Progress: {completedSubtopics.length} / {sessionSubtopics.length} subtopics completed
          </p>
        </div>
      )}

      {currentFlashcard && !followUpQuestion && (
        <div className="flashcard-card">
          {/* Timer */}
          {!showAnswer && timerActive && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '18px',
              color: timeLeft <= 10 ? '#dc2626' : '#059669'
            }}>
              <FaClock style={{ marginRight: '8px' }} />
              <span>{timeLeft}s remaining</span>
            </div>
          )}

          {/* Topic */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <span style={{ 
              background: '#991B1B', 
              color: 'white', 
              padding: '6px 16px', 
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {currentFlashcard.topic}
            </span>
          </div>

          {/* Flashcard Question */}
          <div style={{ 
            background: '#f9fafb', 
            padding: '24px', 
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            {renderText(currentFlashcard.flashcard)}
          </div>

          {/* Rating Stars (shown before answer reveal) */}
          {!showAnswer && timerActive && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                How well do you know this concept?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    disabled={hasRated || !timerActive}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: hasRated || !timerActive ? 'not-allowed' : 'pointer',
                      fontSize: '32px',
                      color: rating && rating >= star ? '#facc15' : '#d1d5db',
                      transition: 'color 0.2s',
                      opacity: hasRated || !timerActive ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!hasRated && timerActive && (!rating || rating < star)) {
                        e.currentTarget.style.color = '#facc15'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!rating || rating < star) {
                        e.currentTarget.style.color = '#d1d5db'
                      }
                    }}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                1-2: Easy | 3-4: Medium | 5: Hard
              </p>
            </div>
          )}

          {/* Answer (revealed after rating or timeout) */}
          {showAnswer && (
            <>
              <div style={{ 
                background: '#ecfdf5', 
                border: '2px solid #059669',
                padding: '24px', 
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#059669', marginBottom: '12px', fontSize: '18px' }}>
                  Answer:
                </h3>
                {renderText(currentFlashcard.flashcardAnswer)}
              </div>

              {difficulty && (
                <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px' }}>
                  Difficulty Level: <strong>{difficulty}</strong>
                </p>
              )}

              {!followUpQuestion && (
                <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                  Loading follow-up question...
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Follow-up Question */}
      {followUpQuestion && !submitResult && (
        <div className="followup-question">
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <span style={{ 
              background: '#059669', 
              color: 'white', 
              padding: '6px 16px', 
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              Follow-up Question - {followUpQuestion.difficulty}
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            {renderText(followUpQuestion.question)}
          </div>

          <div style={{ marginBottom: '20px' }}>
            {Object.entries(followUpQuestion.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSelectedOption(`Option ${key}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px',
                  marginBottom: '12px',
                  border: selectedOption === `Option ${key}` ? '3px solid #991B1B' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  background: selectedOption === `Option ${key}` ? '#fef2f2' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedOption !== `Option ${key}`) {
                    e.currentTarget.style.background = '#f9fafb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOption !== `Option ${key}`) {
                    e.currentTarget.style.background = 'white'
                  }
                }}
              >
                <strong>Option {key}:</strong> {renderText(value)}
              </button>
            ))}
          </div>

          <button
            className="btn"
            onClick={handleSubmitAnswer}
            disabled={!selectedOption || loading}
            style={{
              width: '100%',
              opacity: !selectedOption || loading ? 0.5 : 1,
              cursor: !selectedOption || loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div className="submit-result">
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '24px',
            fontSize: '48px',
            color: submitResult.correct ? '#059669' : '#dc2626'
          }}>
            {submitResult.correct ? <FaCheckCircle /> : <FaTimesCircle />}
          </div>

          <h3 style={{ 
            textAlign: 'center', 
            marginBottom: '16px',
            color: submitResult.correct ? '#059669' : '#dc2626',
            fontSize: '24px'
          }}>
            {submitResult.correct ? 'Correct!' : 'Incorrect'}
          </h3>

          {!submitResult.correct && (
            <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px' }}>
              Correct Answer: <strong>{submitResult.correctAnswer}</strong>
            </p>
          )}

          <div style={{ 
            background: '#f9fafb', 
            padding: '20px', 
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
              Explanation:
            </h4>
            {renderText(submitResult.explanation)}
          </div>

          <button
            className="btn"
            onClick={handleNextFlashcard}
            style={{ width: '100%' }}
          >
            Next Flashcard
          </button>
        </div>
      )}

      {error && currentFlashcard && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#fef2f2', 
          border: '1px solid #dc2626',
          borderRadius: '8px',
          color: '#dc2626',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
