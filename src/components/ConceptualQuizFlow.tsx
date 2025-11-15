import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import type { QuizQuestion, Concept } from '../api/client'
import { fetchSingleQuestion, fetchConcepts } from '../api/client'
import MathBlock from './MathBlock'
import Loader from './Loader'

// Fullscreen API type extensions
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null
  mozFullScreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
  mozCancelFullScreen?: () => void
  msExitFullscreen?: () => void
}

interface ElementWithFullscreen extends Element {
  webkitRequestFullscreen?: () => void
  mozRequestFullScreen?: () => void
  msRequestFullscreen?: () => void
}

type WarningModalProps = {
  isOpen: boolean
  title: string
  message: string
  remainingSwitches?: number
  onConfirm: () => void
  onCancel: () => void
}

function WarningModal({ isOpen, title, message, remainingSwitches, onConfirm, onCancel }: WarningModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: 'var(--white)',
          padding: '28px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text)', lineHeight: 1.6, fontSize: '15px' }}>
          {message}
        </p>
        {remainingSwitches !== undefined && (
          <p style={{ 
            margin: '0 0 20px', 
            color: 'var(--accent)', 
            fontWeight: 600, 
            fontSize: '14px',
            padding: '10px',
            backgroundColor: 'rgba(153, 27, 27, 0.1)',
            borderRadius: '8px'
          }}>
            Remaining warnings: {remainingSwitches}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel} style={{ minWidth: '100px' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ minWidth: '100px' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

type Phase = 'loading-concepts' | 'conceptual' | 'loading' | 'practice' | 'result'

const RATING_VALUES = [1, 2, 3, 4, 5] as const
const STORAGE_KEY_PREFIX = 'nxtquiz_conceptual_'
const MAX_CONCEPTS = 6 // Limit to 6 concepts for the learning flow

function RatingScale({
  disabled,
  onSelect
}: {
  disabled?: boolean
  onSelect: (value: number) => void
}) {
  return (
    <div className="rating-row flashcard-rating-row" role="radiogroup" aria-label="Rate your understanding">
      {RATING_VALUES.map(value => (
        <button
          key={value}
          type="button"
          className="rating-dot"
          onClick={() => onSelect(value)}
          disabled={disabled}
          aria-label={`Rate ${value} out of 5`}
        >
          {value}
        </button>
      ))}
    </div>
  )
}

export default function ConceptualQuizFlow() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading-concepts')
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [practiceQuestion, setPracticeQuestion] = useState<QuizQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Loading concepts from CSV...')
  const [timer, setTimer] = useState(60)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; remainingSwitches?: number; onConfirm: () => void; onCancel: () => void } | null>(null)
  
  const recentQuestionIds = useRef<string[]>([])
  const timerIntervalRef = useRef<number | null>(null)
  const conceptualTimerIntervalRef = useRef<number | null>(null)
  const conceptualTimerStartRef = useRef<number | null>(null)
  const conceptualToastIdRef = useRef<ReturnType<typeof toast> | string | number | null>(null)
  const conceptualToastCountdownRef = useRef<number | null>(null)
  const fullscreenAttemptedRef = useRef(false)
  const isInitialMount = useRef(true)

  const currentConcept = concepts[currentIndex]
  const isLastConcept = currentIndex >= concepts.length - 1

  const getStorageKey = useCallback((key: string) => {
    return `${STORAGE_KEY_PREFIX}${key}`
  }, [])

  const clearLearningStorage = useCallback(() => {
    localStorage.removeItem(getStorageKey('currentIndex'))
    localStorage.removeItem(getStorageKey('phase'))
    localStorage.removeItem(getStorageKey('timer'))
    localStorage.removeItem(getStorageKey('timerStartTime'))
    localStorage.removeItem('conceptual_guidelines_accepted')
  }, [getStorageKey])

  const enterFullscreen = useCallback(() => {
    if (fullscreenAttemptedRef.current) return
    
    const element = document.documentElement as ElementWithFullscreen
    
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => {
        console.log('Error attempting to enter fullscreen:', err)
      })
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen()
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen()
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen()
    }
    
    fullscreenAttemptedRef.current = true
  }, [])

  const exitFullscreen = useCallback(() => {
    const doc = document as DocumentWithFullscreen
    if (document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen()
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen()
      }
    }
  }, [])

  const handleConceptRating = useCallback(
    async (rating: number) => {
      if (!currentConcept) return
      
      // If any rating toast/countdown is active, dismiss and clear it before proceeding
      if (conceptualToastIdRef.current) {
        toast.dismiss(conceptualToastIdRef.current as string | number)
        conceptualToastIdRef.current = null
      }
      if (conceptualToastCountdownRef.current) {
        window.clearInterval(conceptualToastCountdownRef.current)
        conceptualToastCountdownRef.current = null
      }

      setUserRating(rating)
      setLoadingMessage('Finding a practice question for you...')
      setPhase('loading')
      setError(null)

      try {
        // Single fast attempt - no retries for speed
        const res = await fetchSingleQuestion(
          currentConcept.topicId,
          rating,
          recentQuestionIds.current
        )
        const question = res.question
        if (!question) {
          throw new Error('Unable to load a practice question.')
        }
        setPracticeQuestion(question)
        recentQuestionIds.current.push(question.id)
        if (recentQuestionIds.current.length > 12) {
          recentQuestionIds.current = recentQuestionIds.current.slice(-12)
        }
        setSelectedOption(null)
        setTimer(60)
        setTimerStartTime(Date.now())
        setPhase('practice')
      } catch (err) {
        console.error(err)
        setError('Unable to load a practice question. Please try again.')
        setPhase('conceptual')
      }
    },
    [currentConcept]
  )

  const handleOptionSelect = useCallback((index: number) => {
    setSelectedOption(index)
  }, [])

  const handleSubmitAnswer = useCallback(() => {
    if (selectedOption === null || !practiceQuestion) return
    
    // Stop the timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTimerStartTime(null)
    
    setPhase('result')
  }, [selectedOption, practiceQuestion])

  const handleNextConcept = useCallback(() => {
    // Clear timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTimerStartTime(null)
    // Clear conceptual timers and any toasts
    if (conceptualTimerIntervalRef.current) {
      clearInterval(conceptualTimerIntervalRef.current)
      conceptualTimerIntervalRef.current = null
    }
    conceptualTimerStartRef.current = null
    if (conceptualToastCountdownRef.current) {
      window.clearInterval(conceptualToastCountdownRef.current)
      conceptualToastCountdownRef.current = null
    }
    if (conceptualToastIdRef.current) {
      toast.dismiss(conceptualToastIdRef.current as string | number)
      conceptualToastIdRef.current = null
    }

    if (isLastConcept) {
      // Completed all concepts - clear storage and exit fullscreen
      clearLearningStorage()
      exitFullscreen()
      navigate('/')
      return
    }

    // Move to next concept
    setCurrentIndex(prev => prev + 1)
    setPhase('conceptual')
    setUserRating(null)
    setPracticeQuestion(null)
    setSelectedOption(null)
    setError(null)
    setTimer(60)
  }, [isLastConcept, navigate, clearLearningStorage, exitFullscreen])

  // Show rating toast with 5-second countdown
  const showRatingToast = useCallback(() => {
    if (conceptualToastIdRef.current) return
    let remaining = 5
    const renderContent = () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Time up. Rate your understanding in {remaining}s</div>
        <div className="rating-row flashcard-rating-row" role="radiogroup" aria-label="Rate your understanding">
          {RATING_VALUES.map(value => (
            <button
              key={value}
              type="button"
              className="rating-dot"
              onClick={() => {
                if (conceptualToastIdRef.current) toast.dismiss(conceptualToastIdRef.current as string | number)
                conceptualToastIdRef.current = null
                if (conceptualToastCountdownRef.current) {
                  window.clearInterval(conceptualToastCountdownRef.current)
                  conceptualToastCountdownRef.current = null
                }
                handleConceptRating(value)
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    )
    const id = toast.info(renderContent(), { autoClose: false, closeOnClick: false, draggable: false, position: 'top-center' })
    conceptualToastIdRef.current = id
    conceptualToastCountdownRef.current = window.setInterval(() => {
      remaining -= 1
      if (!conceptualToastIdRef.current) {
        window.clearInterval(conceptualToastCountdownRef.current as number)
        conceptualToastCountdownRef.current = null
        return
      }
      if (remaining <= 0) {
        toast.update(conceptualToastIdRef.current as string | number, {
          render: 'Time up for rating.',
          type: 'warning',
          autoClose: 1500
        })
        window.clearInterval(conceptualToastCountdownRef.current as number)
        conceptualToastCountdownRef.current = null
        conceptualToastIdRef.current = null
        return
      }
      toast.update(id as string | number, { render: renderContent() })
    }, 1000)
  }, [handleConceptRating])

  // Timer countdown effect
  useEffect(() => {
    if (phase !== 'practice' || !timerStartTime) return

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setTimer(remaining)

      if (remaining <= 0) {
        // Time's up - auto submit
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        setTimerStartTime(null)
        setPhase('result')
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [phase, timerStartTime])

  // Conceptual phase 60s timer
  useEffect(() => {
    // Start or reset when entering conceptual phase
    if (phase === 'conceptual') {
      // clear practice timers
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      setTimer(60)
      conceptualTimerStartRef.current = Date.now()
      if (conceptualTimerIntervalRef.current) {
        clearInterval(conceptualTimerIntervalRef.current)
      }
      conceptualTimerIntervalRef.current = window.setInterval(() => {
        if (!conceptualTimerStartRef.current) return
        const elapsed = Math.floor((Date.now() - conceptualTimerStartRef.current) / 1000)
        const remaining = Math.max(0, 60 - elapsed)
        setTimer(remaining)
        if (remaining <= 0) {
          if (conceptualTimerIntervalRef.current) {
            clearInterval(conceptualTimerIntervalRef.current)
            conceptualTimerIntervalRef.current = null
          }
          conceptualTimerStartRef.current = null
          // Show rating toast prompt
          if (userRating === null) {
            showRatingToast()
          }
        }
      }, 1000)
    }
    return () => {
      if (conceptualTimerIntervalRef.current) {
        clearInterval(conceptualTimerIntervalRef.current)
        conceptualTimerIntervalRef.current = null
      }
    }
  }, [phase, currentIndex, showRatingToast, userRating])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (conceptualTimerIntervalRef.current) {
        clearInterval(conceptualTimerIntervalRef.current)
      }
      if (conceptualToastCountdownRef.current) {
        window.clearInterval(conceptualToastCountdownRef.current)
      }
    }
  }, [])

  // Fetch concepts from CSV on mount
  useEffect(() => {
    const loadConcepts = async () => {
      try {
        setLoadingMessage('Loading concepts from CSV...')
        const response = await fetchConcepts()
        let loadedConcepts = response.concepts || []
        
        // Limit to MAX_CONCEPTS and shuffle for variety
        if (loadedConcepts.length > MAX_CONCEPTS) {
          // Shuffle and take first MAX_CONCEPTS
          loadedConcepts = loadedConcepts
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_CONCEPTS)
        }
        
        if (loadedConcepts.length === 0) {
          setError('No concepts available in the CSV file. Please ensure the CSV file contains flashcard data.')
          setPhase('result')
          return
        }
        
        setConcepts(loadedConcepts)
        
        // Check guidelines acceptance
        const guidelinesAccepted = localStorage.getItem('conceptual_guidelines_accepted')
        if (!guidelinesAccepted) {
          navigate('/conceptual-guidelines')
          return
        }

        // Try to restore from localStorage
        const savedIndex = localStorage.getItem(getStorageKey('currentIndex'))
        if (savedIndex !== null && isInitialMount.current) {
          const restoredIndex = parseInt(savedIndex, 10)
          if (!isNaN(restoredIndex) && restoredIndex >= 0 && restoredIndex < loadedConcepts.length) {
            setCurrentIndex(restoredIndex)
          }
        }

        setPhase('conceptual')
        isInitialMount.current = false
      } catch (err) {
        console.error('Error loading concepts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load concepts from CSV file')
        setPhase('result')
      }
    }
    
    loadConcepts()
  }, [navigate, getStorageKey])

  // Save progress to localStorage
  useEffect(() => {
    if (!isInitialMount.current) {
      localStorage.setItem(getStorageKey('currentIndex'), currentIndex.toString())
    }
  }, [currentIndex, getStorageKey])

  // Enter fullscreen when component is ready
  useEffect(() => {
    const guidelinesAccepted = localStorage.getItem('conceptual_guidelines_accepted')
    if (guidelinesAccepted && !fullscreenAttemptedRef.current) {
      setTimeout(() => {
        enterFullscreen()
      }, 100)
    }
  }, [enterFullscreen])

  // Warning for browser back button, refresh, or navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your learning progress will be lost.'
      return e.returnValue
    }

    const handlePopState = () => {
      setModalConfig({
        title: '⚠️ Warning',
        message: 'Your learning session will be terminated if you leave this page. Click OK to continue with your session, or Cancel to terminate.',
        onConfirm: () => {
          window.history.pushState(null, '', window.location.href)
          setShowWarningModal(false)
          toast.success('Continuing with your learning session. Please stay on this page.')
        },
        onCancel: () => {
          setShowWarningModal(false)
          clearLearningStorage()
          exitFullscreen()
          toast.error('Learning session terminated. Your progress has been lost.')
          setTimeout(() => {
            navigate('/')
          }, 1000)
        }
      })
      setShowWarningModal(true)
    }

    window.history.pushState(null, '', window.location.href)
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate, clearLearningStorage, exitFullscreen])

  const renderText = useCallback((text: string) => {
    const parts = text.split(/(\$[^$]+\$)/g)
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            return <MathBlock key={idx} math={part.slice(1, -1)} inline={true} />
          }
          return <span key={idx}>{part}</span>
        })}
      </>
    )
  }, [])

  const progressPercentage = useMemo(() => {
    if (concepts.length === 0) return 0
    return Math.round(((currentIndex + (phase === 'result' ? 1 : 0)) / concepts.length) * 100)
  }, [currentIndex, phase, concepts.length])

  const timerIsCritical = timer <= 10
  const isCorrect = selectedOption !== null && practiceQuestion && selectedOption === practiceQuestion.answerIndex

  if (phase === 'loading-concepts' || phase === 'loading') {
    return <Loader message={loadingMessage} />
  }

  if (error && concepts.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p className="muted" style={{ marginBottom: 16 }}>Error: {error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    )
  }

  if (concepts.length === 0) {
    return <Loader message="Loading concepts..." />
  }

  return (
    <div className="quiz-page">
      <div className="quiz-shell">
        <header className="quiz-header card">
          <div className="quiz-header-main">
            <p className="quiz-section-label">Conceptual Learning Path</p>
            <h1 className="quiz-title">Master the Fundamentals</h1>
            <div className="quiz-header-meta">
              <span className="quiz-chip">
                Concept {currentIndex + 1} of {concepts.length}
              </span>
              {currentConcept && (
                <span className={`quiz-chip difficulty-${currentConcept.difficulty}`}>
                  {currentConcept.difficulty.charAt(0).toUpperCase() + currentConcept.difficulty.slice(1)}
                </span>
              )}
            </div>
          </div>
          <div className="quiz-header-panel">
            {(phase === 'practice' || phase === 'conceptual') && (
              <div className="quiz-timer">
                <span className="quiz-timer-label">Time Left</span>
                <span className={`quiz-timer-value ${timerIsCritical ? 'danger' : ''}`}>{timer}s</span>
              </div>
            )}
            <div className="quiz-progress">
              <div className="quiz-progress-bar">
                <div
                  className="quiz-progress-bar-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="quiz-progress-label">{progressPercentage}% Complete</span>
            </div>
          </div>
        </header>

        <div className="quiz-body">
          <aside className="quiz-sidebar">
            <div className="card quiz-sidebar-card">
              <h2 className="quiz-sidebar-title">Learning Progress</h2>
              <ul className="quiz-sidebar-list">
                <li>
                  <span>Current Concept</span>
                  <strong>{currentIndex + 1}</strong>
                </li>
                <li>
                  <span>Remaining</span>
                  <strong>{Math.max(0, concepts.length - currentIndex - 1)}</strong>
                </li>
                <li>
                  <span>Phase</span>
                  <strong className={`difficulty-tag difficulty-${currentConcept?.difficulty || 'medium'}`}>
                    {phase === 'conceptual' ? 'Concept' : phase === 'practice' ? 'Practice' : 'Review'}
                  </strong>
                </li>
              </ul>
            </div>
            <div className="card quiz-sidebar-card">
              <h3 className="quiz-sidebar-title">Session Guidelines</h3>
              <ul className="quiz-guidelines">
                <li>Read each concept carefully.</li>
                <li>Rate your understanding (1-5).</li>
                <li>Solve practice question in 60 seconds.</li>
                <li>Your progress is automatically saved.</li>
              </ul>
            </div>
          </aside>

          <section className="quiz-main card">
            {/* CONCEPTUAL PHASE */}
            {phase === 'conceptual' && currentConcept && (
              <>
                <div className="flashcard-header">
                  <h3>Concept Review</h3>
                  <div className="flashcard-meta">
                    <span className="flashcard-pill">{currentConcept.topicId.toUpperCase()}</span>
                  </div>
                </div>

                <p className="flashcard-question">{renderText(currentConcept.question)}</p>

                <div className="flashcard-answer">
                  <span className="flashcard-answer-label">Answer</span>
                  <div className="flashcard-answer-content">{renderText(currentConcept.answer)}</div>
                </div>

                {currentConcept.explanation && (
                  <div className="flashcard-explanation">
                    <span className="flashcard-answer-label">Explanation</span>
                    <div className="flashcard-answer-content">{renderText(currentConcept.explanation)}</div>
                  </div>
                )}

                {error && (
                  <p className="flashcard-error" style={{ marginTop: '16px' }}>
                    {error}
                  </p>
                )}

                <div className="flashcard-rate-block">
                  <p className="flashcard-rate-label">How confident do you feel about this concept?</p>
                  <RatingScale onSelect={handleConceptRating} />
                  <p className="flashcard-rate-hint">
                    Ratings 1-2 will give you easier questions, while 3-5 unlock harder challenges.
                  </p>
                </div>
              </>
            )}

            {/* PRACTICE PHASE */}
            {phase === 'practice' && practiceQuestion && (
              <>
                <div className="quiz-question-header">
                  <span className="quiz-question-badge">Practice Question</span>
                  <span className="quiz-question-progress">Based on your rating: {userRating}/5</span>
                </div>

                <div className="quiz-question-text">{renderText(practiceQuestion.question)}</div>

                <div className="quiz-options">
                  {practiceQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`option-btn ${selectedOption === i ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(i)}
                    >
                      <span className="option-index">{String.fromCharCode(65 + i)}</span>
                      <span className="option-text">{renderText(opt)}</span>
                    </button>
                  ))}
                </div>

                <div className="quiz-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                  >
                    Submit Answer
                  </button>
                  <button className="btn btn-ghost" onClick={handleNextConcept}>
                    Skip & Continue
                  </button>
                </div>
              </>
            )}

            {/* RESULT PHASE */}
            {phase === 'result' && practiceQuestion && selectedOption !== null && (
              <>
                <div
                  className="result-badge"
                  style={{
                    background: isCorrect ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                    border: `2px solid ${isCorrect ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px'
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 12px',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: isCorrect ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {isCorrect ? '✓ Excellent!' : '✗ Not Quite'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                    {isCorrect
                      ? 'You got the right answer! Great job.'
                      : `The correct answer is: ${String.fromCharCode(65 + practiceQuestion.answerIndex)}`}
                  </p>
                </div>

                <p className="flashcard-question" style={{ marginBottom: '16px' }}>
                  {renderText(practiceQuestion.question)}
                </p>

                <div className="quiz-options">
                  {practiceQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`option-btn ${selectedOption === i ? 'selected' : ''} ${
                        i === practiceQuestion.answerIndex ? 'option-btn-correct' : ''
                      }`}
                      disabled
                      style={{
                        cursor: 'not-allowed',
                        opacity: i === practiceQuestion.answerIndex || i === selectedOption ? 1 : 0.6,
                        borderColor:
                          i === practiceQuestion.answerIndex
                            ? '#15803d'
                            : i === selectedOption
                            ? '#b91c1c'
                            : 'rgba(153,27,27,0.22)',
                        background:
                          i === practiceQuestion.answerIndex
                            ? 'rgba(22,163,74,0.12)'
                            : i === selectedOption
                            ? 'rgba(220,38,38,0.12)'
                            : 'var(--white)'
                      }}
                    >
                      <span
                        className="option-index"
                        style={{
                          background:
                            i === practiceQuestion.answerIndex
                              ? '#15803d'
                              : i === selectedOption
                              ? '#b91c1c'
                              : 'rgba(153,27,27,0.12)',
                          color: i === practiceQuestion.answerIndex || i === selectedOption ? 'white' : 'var(--accent)'
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="option-text">{renderText(opt)}</span>
                    </button>
                  ))}
                </div>

                {practiceQuestion.explanation && (
                  <div className="flashcard-explanation" style={{ marginTop: '20px' }}>
                    <span className="flashcard-answer-label">Explanation</span>
                    <div className="flashcard-answer-content">{renderText(practiceQuestion.explanation)}</div>
                  </div>
                )}

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <button className="btn btn-primary" onClick={handleNextConcept}>
                    {isLastConcept ? 'Complete Learning Path' : 'Next Concept'}
                  </button>
                  {isLastConcept && (
                    <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--muted)' }}>
                      You've completed all concepts!
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {modalConfig && (
        <WarningModal
          isOpen={showWarningModal}
          title={modalConfig.title}
          message={modalConfig.message}
          remainingSwitches={modalConfig.remainingSwitches}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
        />
      )}
    </div>
  )
}

