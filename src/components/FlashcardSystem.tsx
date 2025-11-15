import { useState, useEffect, useCallback } from 'react'
import { FaClock, FaStar, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { renderText } from './renderText'
import {
  fetchRandomFlashcardJson,
  submitFlashcardRating,
  fetchFollowUpQuestion,
  submitFlashcardAnswer,
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
  const [currentFlashcard, setCurrentFlashcard] = useState<FlashcardData | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [followUpQuestion, setFollowUpQuestion] = useState<FollowUpQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial flashcard
  const loadFlashcard = useCallback(async () => {
    setLoading(true)
    setError(null)
    setShowAnswer(false)
    setRating(null)
    setDifficulty(null)
    setFollowUpQuestion(null)
    setSelectedOption(null)
    setSubmitResult(null)
    setTimeLeft(30)

    try {
      const token = getAuthToken()
      const data = await fetchRandomFlashcardJson(token || undefined)
      setCurrentFlashcard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flashcard')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFlashcard()
  }, [loadFlashcard])

  const loadFollowUpQuestion = useCallback(async (topicId: string, diff: string, subTopic?: string) => {
    try {
      const token = getAuthToken()
      const data = await fetchFollowUpQuestion(topicId, diff, subTopic, token || undefined)
      setFollowUpQuestion(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-up question')
    }
  }, [])

  const submitRating = useCallback(async (ratingValue: number) => {
    if (!currentFlashcard) return

    try {
      const token = getAuthToken()
      let data: { difficulty: string }

      // If authenticated, use new submit-rating endpoint with JWT
      if (token) {
        data = await submitFlashcardRating(currentFlashcard.questionId, ratingValue, token)
      } else {
        // Fallback to old rate endpoint for non-authenticated users
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || '}/api/flashcards/rate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
              questionId: currentFlashcard.questionId,
              difficulty: ratingValue,
            }),
          }
        )
        if (!response.ok) {
          throw new Error('Failed to submit rating')
        }
        data = await response.json()
      }

      setDifficulty(data.difficulty)

      // Load follow-up question with subtopic
      await loadFollowUpQuestion(
        currentFlashcard.topicId,
        data.difficulty,
        currentFlashcard.subTopic
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    }
  }, [currentFlashcard, loadFollowUpQuestion])

  const handleAutoRate = useCallback(async () => {
    if (!currentFlashcard) return
    
    // Auto-rate as 1 (Easy)
    setRating(1)
    await submitRating(1)
  }, [currentFlashcard, submitRating])

  // Timer countdown
  useEffect(() => {
    if (!currentFlashcard || showAnswer || followUpQuestion || timeLeft <= 0) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-reveal answer when time runs out
          setShowAnswer(true)
          // Auto-rate as 1 if user didn't rate
          if (rating === null) {
            handleAutoRate()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentFlashcard, showAnswer, followUpQuestion, timeLeft, rating, handleAutoRate])

  const handleRating = async (ratingValue: number) => {
    setRating(ratingValue)
    setShowAnswer(true)
    await submitRating(ratingValue)
  }

  const handleSubmitAnswer = async () => {
    if (!followUpQuestion || !selectedOption) return

    setLoading(true)
    try {
      const token = getAuthToken()

      if (!token) {
        throw new Error('Authentication required to submit answers')
      }

      const data = await submitFlashcardAnswer(
        followUpQuestion.questionId,
        selectedOption,
        token
      )
      setSubmitResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  const handleNextFlashcard = () => {
    loadFlashcard()
  }

  if (loading && !currentFlashcard) {
    return (
      <div className={`flashcard-system ${className}`}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading flashcard...</p>
        </div>
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
      {currentFlashcard && !followUpQuestion && (
        <div className="flashcard-card">
          {/* Timer */}
          {!showAnswer && (
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
          {!showAnswer && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                How well do you know this concept?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '32px',
                      color: rating && rating >= star ? '#facc15' : '#d1d5db',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#facc15'}
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
