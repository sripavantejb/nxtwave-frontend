import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { fetchQuiz } from '../api/client'
import type { QuizQuestion } from '../api/client'
import MathBlock from '../components/MathBlock'
import Loader from '../components/Loader'

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

type AnswerRecord = {
  questionId: string
  selectedIndex: number | null
  correctIndex: number
  explanation: string
  question: string
  options: string[]
  difficulty: 'easy' | 'medium' | 'hard'
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

const STORAGE_KEY_PREFIX = 'nxtquiz_'
const MAX_TAB_SWITCHES = 2

export default function Quiz() {
  const { topicId, rating } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timer, setTimer] = useState(60)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const prevIndexRef = useRef<number | null>(null)
  const isInitialMount = useRef(true)
  const wasTabHiddenRef = useRef(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; remainingSwitches?: number; onConfirm: () => void; onCancel: () => void } | null>(null)
  const fullscreenAttemptedRef = useRef(false)

  const getStorageKey = useCallback((key: string) => {
    return `${STORAGE_KEY_PREFIX}${topicId}_${rating}_${key}`
  }, [topicId, rating])

  const clearQuizStorage = useCallback(() => {
    if (!topicId || !rating) return
    localStorage.removeItem(getStorageKey('questions'))
    localStorage.removeItem(getStorageKey('answers'))
    localStorage.removeItem(getStorageKey('index'))
    localStorage.removeItem(getStorageKey('timer'))
    localStorage.removeItem(getStorageKey('timerStartTime'))
    localStorage.removeItem(getStorageKey('tabSwitchCount'))
    // Clear guidelines acceptance so user must accept again for retakes
    const acceptanceKey = `guidelines_accepted_${topicId}_${rating}`
    localStorage.removeItem(acceptanceKey)
  }, [topicId, rating, getStorageKey])

  const getTabSwitchCount = useCallback(() => {
    const count = localStorage.getItem(getStorageKey('tabSwitchCount'))
    return count ? parseInt(count, 10) : 0
  }, [getStorageKey])

  const incrementTabSwitchCount = useCallback(() => {
    const current = getTabSwitchCount()
    localStorage.setItem(getStorageKey('tabSwitchCount'), (current + 1).toString())
    return current + 1
  }, [getStorageKey, getTabSwitchCount])

  const resetTabSwitchCount = useCallback(() => {
    localStorage.removeItem(getStorageKey('tabSwitchCount'))
  }, [getStorageKey])

  const enterFullscreen = useCallback(() => {
    if (fullscreenAttemptedRef.current) return
    
    const element = document.documentElement as ElementWithFullscreen
    
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => {
        console.log('Error attempting to enter fullscreen:', err)
      })
    } else if (element.webkitRequestFullscreen) {
      // Safari
      element.webkitRequestFullscreen()
    } else if (element.mozRequestFullScreen) {
      // Firefox
      element.mozRequestFullScreen()
    } else if (element.msRequestFullscreen) {
      // IE/Edge
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

  useEffect(() => {
    if (!topicId || !rating) return
    
    // Check if guidelines were accepted
    const acceptanceKey = `guidelines_accepted_${topicId}_${rating}`
    const guidelinesAccepted = localStorage.getItem(acceptanceKey)
    
    if (!guidelinesAccepted) {
      // Redirect to guidelines page if not accepted
      navigate(`/guidelines/${topicId}/${rating}`)
      return
    }
    
    // Reset fullscreen ref when starting a new quiz
    fullscreenAttemptedRef.current = false
    
    // Try to restore from localStorage
    const savedQuestions = localStorage.getItem(getStorageKey('questions'))
    const savedAnswers = localStorage.getItem(getStorageKey('answers'))
    const savedIndex = localStorage.getItem(getStorageKey('index'))
    const savedTimer = localStorage.getItem(getStorageKey('timer'))
    const savedTimerStartTime = localStorage.getItem(getStorageKey('timerStartTime'))

    if (savedQuestions && savedAnswers !== null && savedIndex !== null && savedTimer && savedTimerStartTime) {
      // Restore quiz state
      try {
        setQuestions(JSON.parse(savedQuestions))
        setAnswers(JSON.parse(savedAnswers))
        const restoredIndex = parseInt(savedIndex, 10)
        prevIndexRef.current = restoredIndex
        setIndex(restoredIndex)
        
        // Calculate remaining time based on elapsed time
        const startTime = parseInt(savedTimerStartTime, 10)
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, 60 - elapsed)
        setTimer(remaining)
        setTimerStartTime(startTime)
        setLoading(false)
        isInitialMount.current = false
        // Tab switch count is already persisted in localStorage, no need to restore
        return
      } catch (e) {
        // If restoration fails, fetch new quiz
        console.error('Failed to restore quiz state:', e)
      }
    }

    // Fetch new quiz if no saved state
    setLoading(true)
    fetchQuiz(topicId, Number(rating))
      .then(data => { 
        setQuestions(data.questions)
        setLoading(false)
        prevIndexRef.current = 0
        setIndex(0)
        setTimer(60)
        const now = Date.now()
        setTimerStartTime(now)
        localStorage.setItem(getStorageKey('questions'), JSON.stringify(data.questions))
        localStorage.setItem(getStorageKey('answers'), JSON.stringify([]))
        localStorage.setItem(getStorageKey('index'), '0')
        localStorage.setItem(getStorageKey('timer'), '60')
        localStorage.setItem(getStorageKey('timerStartTime'), now.toString())
        resetTabSwitchCount() // Reset tab switch count for new quiz
        isInitialMount.current = false
      })
      .catch(err => { setError(err.message); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, rating, resetTabSwitchCount])

  // Enter fullscreen when quiz is ready
  useEffect(() => {
    if (!loading && questions.length > 0 && !fullscreenAttemptedRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        enterFullscreen()
      }, 100)
    }
  }, [loading, questions.length, enterFullscreen])

  useEffect(() => {
    // Only reset timer when question index actually changes (not on initial load/restore)
    if (loading || !timerStartTime || isInitialMount.current) {
      if (!isInitialMount.current) {
        prevIndexRef.current = index
      }
      return
    }
    
    // Check if index actually changed
    if (prevIndexRef.current !== null && prevIndexRef.current === index) {
      return
    }
    
    // Save timer start time when question changes
    const now = Date.now()
    setTimerStartTime(now)
    setTimer(60)
    setSelected(null)
    localStorage.setItem(getStorageKey('timer'), '60')
    localStorage.setItem(getStorageKey('timerStartTime'), now.toString())
    localStorage.setItem(getStorageKey('index'), index.toString())
    prevIndexRef.current = index
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, timerStartTime, topicId, rating])

  useEffect(() => {
    if (loading || !timerStartTime) return
    
    const id = setInterval(() => {
      if (!timerStartTime) return
      
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      
      // Save current timer state
      localStorage.setItem(getStorageKey('timer'), remaining.toString())
      
      setTimer(remaining)
      
      if (remaining <= 0) {
        clearInterval(id)
        handleSubmit(true)
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, timerStartTime, topicId, rating])

  // Warning for browser back button, refresh, or navigation away
  useEffect(() => {
    if (loading) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.'
      return e.returnValue
    }

    const handlePopState = () => {
      setModalConfig({
        title: '⚠️ Warning',
        message: 'Your exam will be terminated if you leave this page. Click OK to continue with your exam, or Cancel to terminate.',
        onConfirm: () => {
          // User clicked OK - continue with exam, prevent navigation
          window.history.pushState(null, '', window.location.href)
          setShowWarningModal(false)
          toast.success('Continuing with your exam. Please stay on this page.')
        },
        onCancel: () => {
          // User clicked Cancel - terminate exam
          setShowWarningModal(false)
          clearQuizStorage()
          exitFullscreen()
          toast.error('Exam terminated. Your progress has been lost.')
          setTimeout(() => {
            navigate('/')
          }, 1000)
        }
      })
      setShowWarningModal(true)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched or minimized - mark that it was hidden
        wasTabHiddenRef.current = true
      } else if (wasTabHiddenRef.current) {
        // User switched back to the tab - check switch count
        const newCount = incrementTabSwitchCount()
        const remaining = MAX_TAB_SWITCHES - newCount

        if (newCount >= MAX_TAB_SWITCHES) {
          // Terminate immediately after 2 switches
          clearQuizStorage()
          exitFullscreen()
          toast.error('Exam terminated due to multiple tab switches. Your progress has been lost.')
          setTimeout(() => {
            navigate('/')
          }, 1000)
        } else {
          // Show warning with remaining count
          setModalConfig({
            title: '⚠️ Tab Switch Warning',
            message: `You have switched tabs. Your exam will be terminated if you switch tabs ${remaining} more time${remaining === 1 ? '' : 's'}. Click OK to continue with your exam, or Cancel to terminate.`,
            remainingSwitches: remaining,
            onConfirm: () => {
              // User clicked OK - continue with exam
              setShowWarningModal(false)
              toast.success('Continuing with your exam. Please stay on this page.')
            },
            onCancel: () => {
              // User clicked Cancel - terminate exam
              setShowWarningModal(false)
              clearQuizStorage()
              exitFullscreen()
              toast.error('Exam terminated due to tab switching. Your progress has been lost.')
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

    // Push a state to detect back button
    window.history.pushState(null, '', window.location.href)
    
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading, topicId, rating, clearQuizStorage, navigate, incrementTabSwitchCount, resetTabSwitchCount, exitFullscreen])

  const current = questions[index]
  const totalQuestions = useMemo(() => (questions.length > 0 ? questions.length : 6), [questions.length])
  const progressText = useMemo(() => `Question ${Math.min(index + 1, totalQuestions)} of ${totalQuestions}`, [index, totalQuestions])
  const progressPercentage = useMemo(() => {
    if (totalQuestions === 0) return 0
    return Math.min(100, Math.round((answers.length / totalQuestions) * 100))
  }, [answers.length, totalQuestions])
  const formattedTopic = useMemo(() => {
    if (!topicId) return 'Live Practice Session'
    return topicId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char: string) => char.toUpperCase())
  }, [topicId])
  const difficultyLabel = current?.difficulty ?? 'medium'
  const remainingWarnings = useMemo(() => Math.max(0, MAX_TAB_SWITCHES - getTabSwitchCount()), [getTabSwitchCount])
  const answeredCount = answers.length
  const remainingCount = Math.max(totalQuestions - (index + 1), 0)
  const timerIsCritical = timer <= 10

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleSubmit(_fromTimeout = false) {
    if (!current) return
    const record: AnswerRecord = {
      questionId: current.id,
      selectedIndex: selected,
      correctIndex: current.answerIndex,
      explanation: current.explanation,
      question: current.question,
      options: current.options,
      difficulty: current.difficulty
    }
    const nextAnswers = [...answers, record]
    setAnswers(nextAnswers)
    
    // Save answers to localStorage
    localStorage.setItem(getStorageKey('answers'), JSON.stringify(nextAnswers))
    
    const nextIndex = index + 1
    if (nextIndex >= 6 || nextIndex >= questions.length) {
      const score = nextAnswers.reduce((acc, r) => acc + (r.selectedIndex === r.correctIndex ? 1 : 0), 0)
      // Clear storage when quiz completes
      clearQuizStorage()
      // Exit fullscreen before navigating
      exitFullscreen()
      navigate('/results', { state: { score, total: 6, details: nextAnswers } })
    } else {
      setIndex(nextIndex)
      localStorage.setItem(getStorageKey('index'), nextIndex.toString())
    }
  }

  if (loading) return <Loader message="Loading your quiz..." />
  if (error) return <p className="muted" style={{ padding: 24 }}>Error: {error}</p>
  if (!current) return <p className="muted" style={{ padding: 24 }}>No questions available.</p>

  const renderText = (text: string) => {
    // Normalize escaped newlines from API (e.g., "\\n") and preserve them in rendering
    const normalized = text.replace(/\\n/g, '\n')
    const parts = normalized.split(/(\$[^$]+\$)/g)
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            return <MathBlock key={idx} math={part.slice(1, -1)} inline={true} />
          }
          return <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
        })}
      </>
    )
  }

  return (
    <>
      <div className="quiz-page">
        <div className="quiz-shell">
          <header className="quiz-header card">
            <div className="quiz-header-main">
              <p className="quiz-section-label">Live Assessment</p>
              <h1 className="quiz-title">{formattedTopic}</h1>
              <div className="quiz-header-meta">
                <span className="quiz-chip">{progressText}</span>
                {rating && <span className="quiz-chip">Level {rating}</span>}
                <span className={`quiz-chip difficulty-${difficultyLabel}`}>{difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1)} Focus</span>
              </div>
            </div>
            <div className="quiz-header-panel">
              <div className="quiz-timer">
                <span className="quiz-timer-label">Time Left</span>
                <span className={`quiz-timer-value ${timerIsCritical ? 'danger' : ''}`}>{timer}s</span>
              </div>
              <div className="quiz-progress">
                <div className="quiz-progress-bar">
                  <div
                    className="quiz-progress-bar-fill"
                    style={{ width: `${progressPercentage > 0 ? progressPercentage : 6}%` }}
                  />
                </div>
                <span className="quiz-progress-label">{progressText}</span>
              </div>
            </div>
          </header>

          <div className="quiz-body">
            <aside className="quiz-sidebar">
              <div className="card quiz-sidebar-card">
                <h2 className="quiz-sidebar-title">Session Snapshot</h2>
                <ul className="quiz-sidebar-list">
                  <li>
                    <span>Answered</span>
                    <strong>{answeredCount}</strong>
                  </li>
                  <li>
                    <span>Remaining</span>
                    <strong>{remainingCount}</strong>
                  </li>
                  <li>
                    <span>Difficulty</span>
                    <strong className={`difficulty-tag difficulty-${difficultyLabel}`}>
                      {difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1)}
                    </strong>
                  </li>
                  <li>
                    <span>Tab warnings</span>
                    <strong>{remainingWarnings}</strong>
                  </li>
                </ul>
              </div>
              <div className="card quiz-sidebar-card">
                <h3 className="quiz-sidebar-title">Exam Guidelines</h3>
                <ul className="quiz-guidelines">
                  <li>Each question is timed at 60 seconds.</li>
                  <li>Submit to lock your answer or Skip to move ahead.</li>
                  <li>Switching tabs more than twice will terminate the quiz.</li>
                </ul>
              </div>
            </aside>

            <section className="quiz-main card">
              <div className="quiz-question-header">
                <span className="quiz-question-badge">Question {Math.min(index + 1, totalQuestions)}</span>
                <span className="quiz-question-progress">{progressText}</span>
              </div>
              <div className="quiz-question-text">{renderText(current.question)}</div>
              <div className="quiz-options">
                {current.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`option-btn ${selected === i ? 'selected' : ''}`}
                    onClick={() => setSelected(i)}
                  >
                    <span className="option-index">{String.fromCharCode(65 + i)}</span>
                    <span className="option-text">{renderText(opt)}</span>
                  </button>
                ))}
              </div>
              <div className="quiz-actions">
                <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={selected === null}>
                  Submit
                </button>
                <button className="btn btn-ghost" onClick={() => handleSubmit(true)}>
                  Skip
                </button>
              </div>
            </section>
          </div>
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
    </>
  )
}


