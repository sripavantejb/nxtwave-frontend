import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import type { QuizQuestion } from '../api/client'
import { fetchSingleQuestion } from '../api/client'
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

type ConceptualCard = {
  id: string
  question: string
  answer: string
  explanation?: string
  topicId: string
  difficulty: 'easy' | 'medium' | 'hard'
}

type Phase = 'conceptual' | 'loading' | 'practice' | 'result'

const CONCEPTUAL_QUESTIONS: ConceptualCard[] = [
  {
    id: 'concept-1',
    question: 'Do you remember the formula for calculating Simple Interest?',
    answer: 'SI = $\\frac{P \\times R \\times T}{100}$',
    explanation: 'Where P = Principal, R = Rate of interest per annum, T = Time in years',
    topicId: 'si',
    difficulty: 'easy'
  },
  {
    id: 'concept-2',
    question: 'Do you remember the formula for Compound Interest?',
    answer: 'CI = $P(1 + \\frac{R}{100})^T - P$',
    explanation: 'Where P = Principal, R = Rate of interest per annum, T = Time in years',
    topicId: 'ci',
    difficulty: 'easy'
  },
  {
    id: 'concept-3',
    question: 'Do you remember which one gives more interest for the same principal, rate, and time - SI or CI?',
    answer: 'Compound Interest (CI) always gives more interest than Simple Interest (SI)',
    explanation: 'This is because in CI, interest is calculated on the accumulated amount (principal + previous interest), while in SI, interest is only calculated on the principal.',
    topicId: 'si-ci',
    difficulty: 'medium'
  },
  {
    id: 'concept-4',
    question: 'Do you remember what CP and SP stand for in Profit & Loss problems?',
    answer: 'CP = Cost Price, SP = Selling Price',
    explanation: 'CP is the price at which an item is purchased, and SP is the price at which it is sold.',
    topicId: 'profit-loss',
    difficulty: 'easy'
  },
  {
    id: 'concept-5',
    question: 'Do you remember what MP and SP represent in Profit & Loss problems?',
    answer: 'MP = Marked Price, SP = Selling Price',
    explanation: 'MP is the price marked on the product (list price), and SP is the actual selling price after discount.',
    topicId: 'profit-loss',
    difficulty: 'easy'
  },
  {
    id: 'concept-6',
    question: 'Do you remember how to calculate profit or loss percentage when CP is not given but SP and Profit/Loss are known?',
    answer: 'Profit % = $\\frac{Profit}{CP} \\times 100 = \\frac{Profit}{SP - Profit} \\times 100$',
    explanation: 'Since CP = SP - Profit (or CP = SP + Loss), we can calculate the percentage even when CP is not directly given.',
    topicId: 'profit-loss',
    difficulty: 'medium'
  }
]

const RATING_VALUES = [1, 2, 3, 4, 5] as const
const STORAGE_KEY_PREFIX = 'nxtquiz_conceptual_'
const MAX_TAB_SWITCHES = 2

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
  const [phase, setPhase] = useState<Phase>('conceptual')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [practiceQuestion, setPracticeQuestion] = useState<QuizQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [timer, setTimer] = useState(60)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; remainingSwitches?: number; onConfirm: () => void; onCancel: () => void } | null>(null)
  
  const recentQuestionIds = useRef<string[]>([])
  const timerIntervalRef = useRef<number | null>(null)
  const wasTabHiddenRef = useRef(false)
  const fullscreenAttemptedRef = useRef(false)
  const isInitialMount = useRef(true)

  const currentConcept = CONCEPTUAL_QUESTIONS[currentIndex]
  const isLastConcept = currentIndex >= CONCEPTUAL_QUESTIONS.length - 1

  const getStorageKey = useCallback((key: string) => {
    return `${STORAGE_KEY_PREFIX}${key}`
  }, [])

  const clearLearningStorage = useCallback(() => {
    localStorage.removeItem(getStorageKey('currentIndex'))
    localStorage.removeItem(getStorageKey('phase'))
    localStorage.removeItem(getStorageKey('timer'))
    localStorage.removeItem(getStorageKey('timerStartTime'))
    localStorage.removeItem(getStorageKey('tabSwitchCount'))
    localStorage.removeItem('conceptual_guidelines_accepted')
  }, [getStorageKey])

  const getTabSwitchCount = useCallback(() => {
    const count = localStorage.getItem(getStorageKey('tabSwitchCount'))
    return count ? parseInt(count, 10) : 0
  }, [getStorageKey])

  const incrementTabSwitchCount = useCallback(() => {
    const current = getTabSwitchCount()
    localStorage.setItem(getStorageKey('tabSwitchCount'), (current + 1).toString())
    return current + 1
  }, [getStorageKey, getTabSwitchCount])

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
      
      setUserRating(rating)
      setLoadingMessage('Finding a practice question for you...')
      setPhase('loading')
      setError(null)

      try {
        const { question } = await fetchSingleQuestion(
          currentConcept.topicId,
          rating,
          recentQuestionIds.current
        )
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  // Check guidelines acceptance and initialize
  useEffect(() => {
    const guidelinesAccepted = localStorage.getItem('conceptual_guidelines_accepted')
    
    if (!guidelinesAccepted) {
      navigate('/conceptual-guidelines')
      return
    }

    // Try to restore from localStorage
    const savedIndex = localStorage.getItem(getStorageKey('currentIndex'))
    if (savedIndex !== null && isInitialMount.current) {
      const restoredIndex = parseInt(savedIndex, 10)
      if (!isNaN(restoredIndex) && restoredIndex >= 0 && restoredIndex < CONCEPTUAL_QUESTIONS.length) {
        setCurrentIndex(restoredIndex)
      }
    }

    isInitialMount.current = false
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasTabHiddenRef.current = true
      } else if (wasTabHiddenRef.current) {
        const newCount = incrementTabSwitchCount()
        const remaining = MAX_TAB_SWITCHES - newCount

        if (newCount >= MAX_TAB_SWITCHES) {
          clearLearningStorage()
          exitFullscreen()
          toast.error('Learning session terminated due to multiple tab switches. Your progress has been lost.')
          setTimeout(() => {
            navigate('/')
          }, 1000)
        } else {
          setModalConfig({
            title: '⚠️ Tab Switch Warning',
            message: `You have switched tabs. Your learning session will be terminated if you switch tabs ${remaining} more time${remaining === 1 ? '' : 's'}. Click OK to continue with your session, or Cancel to terminate.`,
            remainingSwitches: remaining,
            onConfirm: () => {
              setShowWarningModal(false)
              toast.success('Continuing with your learning session. Please stay on this page.')
            },
            onCancel: () => {
              setShowWarningModal(false)
              clearLearningStorage()
              exitFullscreen()
              toast.error('Learning session terminated due to tab switching. Your progress has been lost.')
              setTimeout(() => {
                navigate('/')
              }, 1000)
            }
          })
          setShowWarningModal(true)
        }
        wasTabHiddenRef.current = false
      }
    }

    window.history.pushState(null, '', window.location.href)
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [navigate, clearLearningStorage, incrementTabSwitchCount, exitFullscreen])

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
    return Math.round(((currentIndex + (phase === 'result' ? 1 : 0)) / CONCEPTUAL_QUESTIONS.length) * 100)
  }, [currentIndex, phase])

  const remainingWarnings = useMemo(() => Math.max(0, MAX_TAB_SWITCHES - getTabSwitchCount()), [getTabSwitchCount])
  const timerIsCritical = timer <= 10
  const isCorrect = selectedOption !== null && practiceQuestion && selectedOption === practiceQuestion.answerIndex

  if (phase === 'loading') {
    return <Loader message={loadingMessage} />
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
                Concept {currentIndex + 1} of {CONCEPTUAL_QUESTIONS.length}
              </span>
              {currentConcept && (
                <span className={`quiz-chip difficulty-${currentConcept.difficulty}`}>
                  {currentConcept.difficulty.charAt(0).toUpperCase() + currentConcept.difficulty.slice(1)}
                </span>
              )}
            </div>
          </div>
          <div className="quiz-header-panel">
            {phase === 'practice' && (
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
                  <strong>{CONCEPTUAL_QUESTIONS.length - currentIndex - 1}</strong>
                </li>
                <li>
                  <span>Phase</span>
                  <strong className={`difficulty-tag difficulty-${currentConcept?.difficulty || 'medium'}`}>
                    {phase === 'conceptual' ? 'Concept' : phase === 'practice' ? 'Practice' : 'Review'}
                  </strong>
                </li>
                <li>
                  <span>Tab warnings</span>
                  <strong>{remainingWarnings}</strong>
                </li>
              </ul>
            </div>
            <div className="card quiz-sidebar-card">
              <h3 className="quiz-sidebar-title">Session Guidelines</h3>
              <ul className="quiz-guidelines">
                <li>Read each concept carefully.</li>
                <li>Rate your understanding (1-5).</li>
                <li>Solve practice question in 60 seconds.</li>
                <li>Switching tabs more than twice will terminate the session.</li>
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

