import { useState, useEffect, useCallback, useRef } from 'react'
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
  resetShownFlashcards,
  completeBatch,
  getBatch,
  getUserCooldown,
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
  const [followUpTimer, setFollowUpTimer] = useState(60)
  const [followUpTimerActive, setFollowUpTimerActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [flashcardCount, setFlashcardCount] = useState(0)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [flashcardResults, setFlashcardResults] = useState<Array<{
    flashcardQuestion: string
    flashcardAnswer: string
    followUpQuestion: string
    followUpOptions: Record<string, string>
    selectedOption: string | null
    correctAnswer: string
    explanation: string
    correct: boolean
    difficulty: string
    topic: string
  }>>([])
  const [isNewSession, setIsNewSession] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [followUpTimerStartTime, setFollowUpTimerStartTime] = useState<number | null>(null)
  // Cooldown timer state (5 minutes after batch completion)
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState<string>('00:00')
  const [cooldownTimerActive, setCooldownTimerActive] = useState(false)
  const [hasBatchCompletionTime, setHasBatchCompletionTime] = useState(false)
  const cooldownTimerIntervalRef = useRef<number | null>(null)
  // Batch management state
  const [batchFlashcards, setBatchFlashcards] = useState<FlashcardData[]>([])
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  
  // Refs to store current values for timer callback
  const currentFlashcardRef = useRef<FlashcardData | null>(null)
  const followUpQuestionRef = useRef<FollowUpQuestion | null>(null)
  const difficultyRef = useRef<string | null>(null)
  const completedSubtopicsRef = useRef<string[]>([])
  const flashcardCountRef = useRef(0)
  const handleStartNewBatchRef = useRef<(() => Promise<void>) | null>(null)
  
  // Update refs when state changes
  useEffect(() => {
    currentFlashcardRef.current = currentFlashcard
  }, [currentFlashcard])
  
  useEffect(() => {
    followUpQuestionRef.current = followUpQuestion
  }, [followUpQuestion])
  
  useEffect(() => {
    difficultyRef.current = difficulty
  }, [difficulty])
  
  useEffect(() => {
    completedSubtopicsRef.current = completedSubtopics
  }, [completedSubtopics])
  
  useEffect(() => {
    flashcardCountRef.current = flashcardCount
  }, [flashcardCount])

  // localStorage keys for flashcard progress
  const FLASHCARD_STORAGE_KEY = 'nxtquiz_flashcardProgress'

  // Save flashcard progress to localStorage
  const saveFlashcardProgress = useCallback(() => {
    const progress = {
      flashcardCount,
      correctCount,
      incorrectCount,
      flashcardResults,
      completedSubtopics,
      hasStarted,
      currentFlashcard,
      showAnswer,
      rating,
      difficulty,
      followUpQuestion,
      selectedOption,
      submitResult,
      timerActive,
      timeLeft,
      timerStartTime,
      followUpTimerActive,
      followUpTimer,
      followUpTimerStartTime,
      hasRated,
      showHint,
      timestamp: Date.now()
    }
    localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(progress))
  }, [
    flashcardCount, 
    correctCount, 
    incorrectCount, 
    flashcardResults, 
    completedSubtopics,
    hasStarted,
    currentFlashcard,
    showAnswer,
    rating,
    difficulty,
    followUpQuestion,
    selectedOption,
    submitResult,
    timerActive,
    timeLeft,
    timerStartTime,
    followUpTimerActive,
    followUpTimer,
    followUpTimerStartTime,
    hasRated,
    showHint
  ])

  // Restore flashcard progress from localStorage
  const restoreFlashcardProgress = useCallback(() => {
    const stored = localStorage.getItem(FLASHCARD_STORAGE_KEY)
    if (stored) {
      try {
        const progress = JSON.parse(stored)
        // Only restore if data is less than 1 hour old (session should still be active)
        if (progress.timestamp && Date.now() - progress.timestamp < 3600000) {
          setFlashcardCount(progress.flashcardCount || 0)
          setCorrectCount(progress.correctCount || 0)
          setIncorrectCount(progress.incorrectCount || 0)
          setFlashcardResults(progress.flashcardResults || [])
          setCompletedSubtopics(progress.completedSubtopics || [])
          setHasStarted(progress.hasStarted || false)
          
          // Restore current flashcard if it exists
          if (progress.currentFlashcard) {
            setCurrentFlashcard(progress.currentFlashcard)
          }
          
          // Restore UI states
          setShowAnswer(progress.showAnswer || false)
          setRating(progress.rating || null)
          setDifficulty(progress.difficulty || null)
          setFollowUpQuestion(progress.followUpQuestion || null)
          setSelectedOption(progress.selectedOption || null)
          setSubmitResult(progress.submitResult || null)
          setHasRated(progress.hasRated || false)
          setShowHint(progress.showHint || false)
          
          // Restore timer states with time calculation
          if (progress.timerStartTime && progress.timerActive && progress.timeLeft) {
            const elapsed = Math.floor((Date.now() - progress.timerStartTime) / 1000)
            const remaining = Math.max(0, progress.timeLeft - elapsed)
            setTimeLeft(remaining)
            setTimerActive(remaining > 0)
            if (remaining > 0) {
              setTimerStartTime(progress.timerStartTime)
            } else {
              // Timer expired during reload, auto-reveal answer
              setShowAnswer(true)
              setTimerActive(false)
            }
          } else {
            setTimeLeft(progress.timeLeft || 30)
            setTimerActive(progress.timerActive || false)
            setTimerStartTime(progress.timerStartTime || null)
          }
          
          // Restore follow-up timer states
          if (progress.followUpTimerStartTime && progress.followUpTimerActive && progress.followUpTimer) {
            const elapsed = Math.floor((Date.now() - progress.followUpTimerStartTime) / 1000)
            const remaining = Math.max(0, progress.followUpTimer - elapsed)
            setFollowUpTimer(remaining)
            setFollowUpTimerActive(remaining > 0)
            if (remaining > 0) {
              setFollowUpTimerStartTime(progress.followUpTimerStartTime)
            } else {
              setFollowUpTimerActive(false)
            }
          } else {
            setFollowUpTimer(progress.followUpTimer || 60)
            setFollowUpTimerActive(progress.followUpTimerActive || false)
            setFollowUpTimerStartTime(progress.followUpTimerStartTime || null)
          }
          
          // If we've completed 6 flashcards, show continue prompt
          if (progress.flashcardCount >= 6) {
            setShowContinuePrompt(true)
          }
          return true // Indicates progress was restored
        } else {
          // Clear old data
          localStorage.removeItem(FLASHCARD_STORAGE_KEY)
        }
      } catch (err) {
        console.error('Error parsing stored flashcard progress:', err)
        localStorage.removeItem(FLASHCARD_STORAGE_KEY)
      }
    }
    return false // No progress restored
  }, [])

  // Save progress whenever it changes
  useEffect(() => {
    // Don't save if we're still initializing or if it's a new session with no progress
    if (initializing || (isNewSession && flashcardCount === 0 && correctCount === 0 && incorrectCount === 0 && !hasStarted)) {
      return
    }
    saveFlashcardProgress()
  }, [
    flashcardCount, 
    correctCount, 
    incorrectCount, 
    flashcardResults, 
    completedSubtopics, 
    hasStarted,
    currentFlashcard,
    showAnswer,
    rating,
    difficulty,
    followUpQuestion,
    selectedOption,
    submitResult,
    timerActive,
    timeLeft,
    timerStartTime,
    followUpTimerActive,
    followUpTimer,
    followUpTimerStartTime,
    hasRated,
    showHint,
    saveFlashcardProgress, 
    initializing, 
    isNewSession
  ])

  // Check authentication and initialize session on mount
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    // Try to restore progress first
    const progressRestored = restoreFlashcardProgress()

    // Initialize session
    const initSession = async (forceNew = false) => {
      setInitializing(true)
      try {
        const session = await startFlashcardSession(token, forceNew)
        setSessionSubtopics(session.sessionSubtopics)
        
        // Only reset progress if it's a truly new session (not a page refresh)
        if (forceNew || !progressRestored) {
          // Reset flashcard count for new session
          setFlashcardCount(0)
          setCompletedSubtopics([]) // Reset completed subtopics for new session
          setShowContinuePrompt(false)
          // Reset score counters and results for new session
          setCorrectCount(0)
          setIncorrectCount(0)
          setFlashcardResults([])
          setIsNewSession(true)
          setHasStarted(false) // Reset hasStarted for new session
          // Clear persisted progress for new session
          localStorage.removeItem(FLASHCARD_STORAGE_KEY)
        } else {
          // Progress was restored, so this is not a new session
          setIsNewSession(false)
        }
        
        // Clear day shift timer flag for new session - timer should only start after completing batch of 6
        // Only clear if it's a truly new session
        if (forceNew || !progressRestored) {
          localStorage.removeItem('hasAttemptedFlashcard')
          localStorage.removeItem('batchCompletionTime')
          // Dispatch event to notify Navbar that flag was cleared
          window.dispatchEvent(new Event('flashcardAttempted'))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize session')
      } finally {
        setInitializing(false)
      }
    }

    initSession()
  }, [navigate, restoreFlashcardProgress])

  // Initialize cooldown timer on mount if batchCompletionTime exists
  useEffect(() => {
    const batchCompletionTimeStr = localStorage.getItem('batchCompletionTime')
    const hasCompletionTime = batchCompletionTimeStr !== null
    setHasBatchCompletionTime(hasCompletionTime)
    
    if (batchCompletionTimeStr) {
      const completionTime = parseInt(batchCompletionTimeStr, 10)
      if (!isNaN(completionTime)) {
        const targetTime = completionTime + (5 * 60 * 1000)
        const now = Date.now()
        const remaining = targetTime - now
        
        if (remaining > 0) {
          // Timer still active
          const totalSeconds = Math.floor(remaining / 1000)
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          setCooldownTimeRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
          setCooldownTimerActive(true)
        } else {
          // Timer completed
          setCooldownTimeRemaining('00:00')
          setCooldownTimerActive(false)
        }
      }
    }
  }, []) // Run once on mount

  // Cooldown timer effect (5 minutes after batch completion) - syncs with server
  useEffect(() => {
    const updateCooldownFromServer = async () => {
      const token = getAuthToken()
      if (!token) {
        setCooldownTimerActive(false)
        setCooldownTimeRemaining('00:00')
        return
      }

      try {
        const cooldownStatus = await getUserCooldown(token)
        setCooldownTimeRemaining(cooldownStatus.remainingTime)
        setCooldownTimerActive(!cooldownStatus.canStart)
        // Automatically load new batch if cooldown has expired
        if (cooldownStatus.canStart && showContinuePrompt && handleStartNewBatchRef.current) {
          handleStartNewBatchRef.current().catch(err => {
            console.error('Error auto-loading new batch:', err)
          })
        }
      } catch (err) {
        // Fallback to localStorage if server call fails
      const batchCompletionTimeStr = localStorage.getItem('batchCompletionTime')
      const hasCompletionTime = batchCompletionTimeStr !== null
      setHasBatchCompletionTime(hasCompletionTime)
      
      if (!batchCompletionTimeStr) {
        setCooldownTimerActive(false)
        setCooldownTimeRemaining('00:00')
        return
      }

      const completionTime = parseInt(batchCompletionTimeStr, 10)
      if (isNaN(completionTime)) {
        setCooldownTimerActive(false)
        setCooldownTimeRemaining('00:00')
        return
      }

        const targetTime = completionTime + (5 * 60 * 1000)
        const now = Date.now()
        const remaining = targetTime - now

        if (remaining <= 0) {
          setCooldownTimeRemaining('00:00')
          setCooldownTimerActive(false)
          // Automatically load new batch when timer expires
          if (showContinuePrompt && handleStartNewBatchRef.current) {
            handleStartNewBatchRef.current().catch(err => {
              console.error('Error auto-loading new batch:', err)
            })
          }
        } else {
          const totalSeconds = Math.max(0, Math.floor(remaining / 1000))
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          setCooldownTimeRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
          setCooldownTimerActive(true)
        }
      }
    }

    // Initial update
    updateCooldownFromServer()

    // Set up interval to sync with server every 10 seconds
    const syncInterval = window.setInterval(updateCooldownFromServer, 10000)

    // Also set up local timer for smooth countdown
    const localTimerInterval = window.setInterval(() => {
      const token = getAuthToken()
      if (!token) return

      const batchCompletionTimeStr = localStorage.getItem('batchCompletionTime')
      const hasCompletionTime = batchCompletionTimeStr !== null
      setHasBatchCompletionTime(hasCompletionTime)
      
      if (!batchCompletionTimeStr) {
        setCooldownTimerActive(false)
        setCooldownTimeRemaining('00:00')
        return
      }

      const completionTime = parseInt(batchCompletionTimeStr, 10)
      if (isNaN(completionTime)) {
        setCooldownTimerActive(false)
        setCooldownTimeRemaining('00:00')
        return
      }

      const targetTime = completionTime + (5 * 60 * 1000)
      const now = Date.now()
      const remaining = targetTime - now

      if (remaining <= 0) {
        setCooldownTimeRemaining('00:00')
        setCooldownTimerActive(false)
        // Automatically load new batch when timer expires
        if (showContinuePrompt && handleStartNewBatchRef.current) {
          handleStartNewBatchRef.current().catch(err => {
            console.error('Error auto-loading new batch:', err)
          })
        }
      } else {
        const totalSeconds = Math.max(0, Math.floor(remaining / 1000))
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        setCooldownTimeRemaining(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
        setCooldownTimerActive(true)
      }
    }, 1000)

    // Cleanup
    return () => {
      clearInterval(syncInterval)
      clearInterval(localTimerInterval)
      if (cooldownTimerIntervalRef.current !== null) {
        clearInterval(cooldownTimerIntervalRef.current)
        cooldownTimerIntervalRef.current = null
      }
    }
  }, [showContinuePrompt]) // Re-run when showContinuePrompt changes

  // Handler for starting new batch
  const handleStartNewBatch = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check server-side cooldown first
      const cooldownStatus = await getUserCooldown(token)
      
      if (!cooldownStatus.canStart) {
        // Cooldown still active - update timer and show error
        setCooldownTimeRemaining(cooldownStatus.remainingTime)
        setCooldownTimerActive(true)
        setError(`Please wait ${cooldownStatus.remainingTime} before starting a new batch`)
        setLoading(false)
        return
      }
      
      // Cooldown expired - get new batch
      const batchResponse = await getBatch(token)
      setBatchFlashcards(batchResponse.flashcards)
      setCurrentBatchIndex(0)
      
      // Extract subtopics from batch for backward compatibility
      const subtopics = Array.from(new Set(batchResponse.flashcards.map(f => f.subTopic)))
      setSessionSubtopics(subtopics)
      
      // Reset all state for new batch
      setFlashcardCount(0)
      setCorrectCount(0)
      setIncorrectCount(0)
      setFlashcardResults([])
      setCompletedSubtopics([])
      setShowContinuePrompt(false)
      setCooldownTimerActive(false)
      setCooldownTimeRemaining('00:00')
      setIsNewSession(true)
      setHasStarted(false)
      
      // Clear batch completion time
      localStorage.removeItem('batchCompletionTime')
      localStorage.removeItem('hasAttemptedFlashcard')
      setHasBatchCompletionTime(false)
      
      // Clear persisted progress
      localStorage.removeItem(FLASHCARD_STORAGE_KEY)
      
      // Clear current flashcard and related state
      setCurrentFlashcard(null)
      setShowAnswer(false)
      setRating(null)
      setDifficulty(null)
      setFollowUpQuestion(null)
      setSelectedOption(null)
      setSubmitResult(null)
      setTimerActive(false)
      setTimeLeft(30)
      setTimerStartTime(null)
      setHasRated(false)
      setFollowUpTimer(60)
      setFollowUpTimerActive(false)
      setFollowUpTimerStartTime(null)
      setShowHint(false)
      
      // Dispatch event to notify Navbar
      window.dispatchEvent(new Event('flashcardAttempted'))
      
      setLoading(false)
    } catch (err) {
      const error = err as Error & { status?: number; remainingTime?: string; remainingSeconds?: number; canStart?: boolean }
      // Handle cooldown error (429) - check if error message contains cooldown info
      if (error.status === 429 || error.remainingTime) {
        const remainingTime = error.remainingTime || '00:00'
        setCooldownTimeRemaining(remainingTime)
        setCooldownTimerActive(true)
        setError(`Please wait ${remainingTime} before starting a new batch`)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create new batch')
      }
      setLoading(false)
    }
  }, [navigate])
  
  // Store handleStartNewBatch in ref for use in useEffect
  useEffect(() => {
    handleStartNewBatchRef.current = handleStartNewBatch
  }, [handleStartNewBatch])

  // Load next flashcard with priority logic
  const loadFlashcard = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    // Stop loading if we've completed 6 flashcards
    if (flashcardCount >= 6) {
      setShowContinuePrompt(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setShowAnswer(false)
    setRating(null)
    setDifficulty(null)
    setFollowUpQuestion(null)
    setSelectedOption(null)
    setTimeLeft(30)
    setTimerActive(true)
    setTimerStartTime(Date.now())
    setHasRated(false)
    setFollowUpTimer(60)
    setFollowUpTimerActive(false)
    setFollowUpTimerStartTime(null)
    setShowHint(false)
    // Reset score counters only when starting a new session (isNewSession is true)
    if (isNewSession && flashcardCount === 0) {
      setCorrectCount(0)
      setIncorrectCount(0)
      setFlashcardResults([])
      setIsNewSession(false)
    }

    try {
      // Priority 0: Check if we have batch flashcards loaded
      // When a batch exists, ONLY serve from the batch (strict batch mode)
      if (batchFlashcards.length > 0) {
        if (currentBatchIndex < batchFlashcards.length) {
          // Serve next flashcard from batch
          const flashcard = batchFlashcards[currentBatchIndex]
          setCurrentFlashcard(flashcard)
          setCurrentBatchIndex(currentBatchIndex + 1)
          setSubmitResult(null)
          setLoading(false)
          return
        } else {
          // Batch exhausted - should not happen if flashcardCount check works correctly
          // But if it does, show continue prompt
          setShowContinuePrompt(true)
          setLoading(false)
          return
        }
      }
      
      // Priority 1: Check for due reviews (only if no batch is loaded)
      try {
        const dueQuestion = await getNextQuestion(token)
        if (dueQuestion && 'flashcard' in dueQuestion) {
          console.log('Loaded flashcard from due reviews:', dueQuestion)
          setCurrentFlashcard(dueQuestion as FlashcardData)
          setSubmitResult(null) // Clear previous result now that new flashcard is loaded
          setLoading(false)
          return
        }
      } catch {
        // No due reviews, continue to priority 2
      }

      // Priority 2: Get flashcard from session subtopics
      const data = await fetchRandomFlashcardJson(token)
      console.log('Loaded flashcard data:', data)
      
      // Check if all subtopics are completed
      if ('allCompleted' in data && data.allCompleted) {
        // Start new session (force new session by passing force parameter)
        try {
          const newSession = await startFlashcardSession(token, true) // Force new session
          setSessionSubtopics(newSession.sessionSubtopics)
          setCompletedSubtopics([]) // Reset completed subtopics
          setFlashcardCount(0) // Reset flashcard count
          setShowContinuePrompt(false)
          // Reset score counters and results for new session
          setCorrectCount(0)
          setIncorrectCount(0)
          setFlashcardResults([])
          setIsNewSession(true)
          setHasStarted(false)
          // Clear persisted progress for new session
          localStorage.removeItem(FLASHCARD_STORAGE_KEY)
          // Try loading again with a small delay to ensure session is saved
          await new Promise(resolve => setTimeout(resolve, 100))
          const newData = await fetchRandomFlashcardJson(token)
          
          // Never show "all completed" error - backend should always return a flashcard
          // If still all completed, try resetting shown flashcards and fetching again
          if ('allCompleted' in newData && newData.allCompleted) {
            // Reset shown flashcards and try fetching from entire CSV
            try {
              const resetResult = await resetShownFlashcards(token)
              // Continue even if reset failed (endpoint might not exist)
              if (resetResult) {
                await new Promise(resolve => setTimeout(resolve, 100))
              }
              const retryData = await fetchRandomFlashcardJson(token)
              
              if ('flashcard' in retryData) {
                setCurrentFlashcard(retryData as FlashcardData)
                setSubmitResult(null) // Clear previous result now that new flashcard is loaded
              } else {
                // Last resort: try one more time
                const finalData = await fetchRandomFlashcardJson(token)
                if ('flashcard' in finalData) {
                  setCurrentFlashcard(finalData as FlashcardData)
                  setSubmitResult(null) // Clear previous result now that new flashcard is loaded
                } else {
                  // Silently continue - backend should handle retries
                  // Don't log as error since this is handled gracefully
                }
              }
            } catch (retryErr) {
              console.error('Error retrying flashcard load:', retryErr)
              // Don't show error - backend should handle this
            }
          } else if ('flashcard' in newData) {
            setCurrentFlashcard(newData as FlashcardData)
            setSubmitResult(null) // Clear previous result now that new flashcard is loaded
          } else {
            // Try one more time without showing error
            try {
              const resetResult = await resetShownFlashcards(token)
              // Continue even if reset failed (endpoint might not exist)
              if (resetResult) {
                await new Promise(resolve => setTimeout(resolve, 100))
              }
              const retryData = await fetchRandomFlashcardJson(token)
              if ('flashcard' in retryData) {
                setCurrentFlashcard(retryData as FlashcardData)
                setSubmitResult(null) // Clear previous result now that new flashcard is loaded
              }
            } catch (err) {
              console.error('Error loading flashcard:', err)
            }
          }
        } catch (sessionErr) {
          console.error('Error starting new session:', sessionErr)
          // Try to load flashcard anyway - don't show error
          try {
            const fallbackData = await fetchRandomFlashcardJson(token)
            if ('flashcard' in fallbackData) {
              setCurrentFlashcard(fallbackData as FlashcardData)
              setSubmitResult(null) // Clear previous result now that new flashcard is loaded
            }
          } catch (fallbackErr) {
            console.error('Error in fallback flashcard load:', fallbackErr)
          }
        }
      } else if ('flashcard' in data) {
        setCurrentFlashcard(data as FlashcardData)
        setSubmitResult(null) // Clear previous result now that new flashcard is loaded
      } else {
        // Try to reset and fetch again instead of showing error
        try {
          const resetResult = await resetShownFlashcards(token)
          // Continue even if reset failed (endpoint might not exist)
          if (resetResult) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          const retryData = await fetchRandomFlashcardJson(token)
          if ('flashcard' in retryData) {
            setCurrentFlashcard(retryData as FlashcardData)
            setSubmitResult(null) // Clear previous result now that new flashcard is loaded
          } else {
            console.error('No flashcards available after reset')
          }
        } catch (err) {
          console.error('Error retrying flashcard load:', err)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flashcard'
      const requiresSession = (err as { requiresSession?: boolean })?.requiresSession || errorMessage.includes('No active session') || errorMessage.includes('requiresSession')
      
      if (requiresSession) {
        // Try to start session and retry
        try {
          const token = getAuthToken()
          if (token) {
            const session = await startFlashcardSession(token)
            setSessionSubtopics(session.sessionSubtopics)
            setCompletedSubtopics([]) // Reset completed subtopics
            setFlashcardCount(0) // Reset flashcard count
            setShowContinuePrompt(false)
            // Reset score counters and results for new session
            setCorrectCount(0)
            setIncorrectCount(0)
            setFlashcardResults([])
            setIsNewSession(true)
            setHasStarted(false)
            // Retry loading flashcard
            const retryData = await fetchRandomFlashcardJson(token)
            if (retryData && 'flashcard' in retryData) {
              setCurrentFlashcard(retryData as FlashcardData)
              setSubmitResult(null) // Clear previous result now that new flashcard is loaded
              setLoading(false)
              return
            } else if (retryData && 'allCompleted' in retryData && retryData.allCompleted) {
              // All completed, start new session
              const newSession = await startFlashcardSession(token)
              setSessionSubtopics(newSession.sessionSubtopics)
              setCompletedSubtopics([])
              // Reset flashcard count for new session
              setFlashcardCount(0)
              setShowContinuePrompt(false)
              // Reset score counters and results for new session
              setCorrectCount(0)
              setIncorrectCount(0)
              setFlashcardResults([])
              setIsNewSession(true)
              setHasStarted(false)
              const newData = await fetchRandomFlashcardJson(token)
              if (newData && 'flashcard' in newData) {
                setCurrentFlashcard(newData as FlashcardData)
                setSubmitResult(null) // Clear previous result now that new flashcard is loaded
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
  }, [navigate, flashcardCount, isNewSession, batchFlashcards, currentBatchIndex])

  // Listen for new batch start event after day shift
  useEffect(() => {
    const handleStartNewBatch = async () => {
      const token = getAuthToken()
      if (token) {
        // Reset shown flashcards and start new session
        try {
          const resetResult = await resetShownFlashcards(token)
          // Continue even if reset failed (endpoint might not exist)
          if (resetResult) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          const session = await startFlashcardSession(token, true) // Force new session
          setSessionSubtopics(session.sessionSubtopics)
          setCompletedSubtopics([]) // Reset completed subtopics
          setFlashcardCount(0) // Reset flashcard count
          setShowContinuePrompt(false)
          // Reset score counters and results for new session
          setCorrectCount(0)
          setIncorrectCount(0)
          setFlashcardResults([])
          setIsNewSession(true)
          setHasStarted(false)
          // Clear persisted progress for new session
          localStorage.removeItem(FLASHCARD_STORAGE_KEY)
          // Clear day shift timer flag for new session
          localStorage.removeItem('hasAttemptedFlashcard')
          localStorage.removeItem('batchCompletionTime')
          // Dispatch event to notify Navbar that flag was cleared
          window.dispatchEvent(new Event('flashcardAttempted'))
          // Load first flashcard of new batch
          await loadFlashcard()
        } catch (err) {
          console.error('Error starting new batch:', err)
        }
      }
    }

    window.addEventListener('startNewBatchAfterDayShift', handleStartNewBatch)

    return () => {
      window.removeEventListener('startNewBatchAfterDayShift', handleStartNewBatch)
    }
  }, [loadFlashcard, navigate])

  // Initial load - only if hasStarted is true and no currentFlashcard exists
  useEffect(() => {
    const token = getAuthToken()
    if (token && sessionSubtopics.length > 0 && hasStarted && !currentFlashcard) {
      loadFlashcard()
    }
  }, [sessionSubtopics.length, hasStarted, currentFlashcard, loadFlashcard])

  const loadFollowUpQuestion = useCallback(async (topicId: string, diff: string, subTopic?: string, flashcardQuestionId?: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }
      const data = await fetchFollowUpQuestion(topicId, diff, subTopic, token, flashcardQuestionId)
      setFollowUpQuestion(data)
      // Start timer for follow-up question
      setFollowUpTimer(60)
      setFollowUpTimerActive(true)
      setFollowUpTimerStartTime(Date.now())
    } catch (err) {
      // Handle 404 errors gracefully - no follow-up question available, skip it
      const error = err as Error & { status?: number }
      if (error?.status === 404 || (error?.message && error.message.includes('No follow-up questions available'))) {
        // Silently skip follow-up question - don't show error to user
        console.log('No follow-up question available, skipping...')
        // Don't set error state - just continue without follow-up question
        // The UI will show the flashcard answer without a follow-up question
        return
      }
      // For other errors, log but don't show to user (to avoid disrupting flow)
      console.error('Error loading follow-up question:', err)
      // Don't set error state - gracefully continue without follow-up question
    }
  }, [])

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
          setTimerStartTime(null)
          // Auto-rate as 1 if user didn't rate
          if (!hasRated && rating === null && currentFlashcard) {
            // Use submitRating directly - it's defined before this useEffect
            submitRating(1).catch(err => {
              console.error('Error auto-rating:', err)
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentFlashcard, showAnswer, followUpQuestion, timeLeft, timerActive, hasRated, rating, submitRating])

  const handleAutoSubmitAnswer = useCallback(async () => {
    // Get current values from refs to avoid stale closure
    const currentFlashcardData = currentFlashcardRef.current
    const currentFollowUp = followUpQuestionRef.current
    const currentDifficulty = difficultyRef.current || 'medium'
    const currentCompletedSubtopics = completedSubtopicsRef.current
    const currentFlashcardCount = flashcardCountRef.current
    
    if (!currentFollowUp || !currentFlashcardData) {
      setLoading(false)
      return
    }

    setFollowUpTimerActive(false)
    setFollowUpTimerStartTime(null)
    setLoading(true)
    
    try {
      // When time runs out, skip API submission and move directly to next flashcard
      // Track as incorrect locally without calling the backend
      setIncorrectCount((prev) => prev + 1)

      // Store individual result for timeout case
      const correctAnswerKey = currentFollowUp.key || 'A'
      const result = {
        flashcardQuestion: currentFlashcardData.flashcard,
        flashcardAnswer: currentFlashcardData.flashcardAnswer || '',
        followUpQuestion: currentFollowUp.question,
        followUpOptions: currentFollowUp.options,
        selectedOption: null, // No answer selected (timeout)
        correctAnswer: `Option ${correctAnswerKey}`,
        explanation: currentFollowUp.explanation || 'Time ran out. No answer was submitted.',
        correct: false,
        difficulty: currentDifficulty,
        topic: currentFlashcardData.topic
      }
      setFlashcardResults((prev) => [...prev, result])

      // Mark subtopic as completed
      if (currentFlashcardData.subTopic && !currentCompletedSubtopics.includes(currentFlashcardData.subTopic)) {
        setCompletedSubtopics([...currentCompletedSubtopics, currentFlashcardData.subTopic])
      }

      // Increment flashcard count
      const newCount = currentFlashcardCount + 1
      setFlashcardCount(newCount)

      // Create a result object for display purposes (timeout case - always incorrect)
      const timeoutResult = {
        correct: false,
        correctAnswer: `Option ${correctAnswerKey}`,
        explanation: currentFollowUp.explanation || 'Time ran out. No answer was submitted.'
      }
      setSubmitResult(timeoutResult)

      // If we've completed 6 flashcards, show continue prompt and start day shift timer
      if (newCount >= 6) {
        setShowContinuePrompt(true)
        // Start day shift timer after completing batch of 6 flashcards
        const completionTime = Date.now()
        localStorage.setItem('hasAttemptedFlashcard', 'true')
        localStorage.setItem('batchCompletionTime', completionTime.toString())
        setHasBatchCompletionTime(true)
        
        // Store batch completion time on backend
        const token = getAuthToken()
        if (token) {
          try {
            await completeBatch(token, completionTime)
          } catch (err) {
            // Silently fail - backend might not be available, but frontend timer will still work
            console.error('Error storing batch completion time:', err)
          }
        }
        
        // Clear batch flashcards state
        setBatchFlashcards([])
        setCurrentBatchIndex(0)
        
        // Dispatch custom event to notify Navbar immediately
        window.dispatchEvent(new Event('flashcardAttempted'))
        // Clear follow-up question state - result will be shown, user can view summary
        setFollowUpQuestion(null)
        setSelectedOption(null)
        setError(null)
      } else {
        // Clear follow-up question state - result will be shown, user clicks "Next Flashcard" to proceed
        setFollowUpQuestion(null)
        setSelectedOption(null)
        setError(null)
        // Don't automatically load next flashcard - wait for user to click "Next Flashcard" button
      }
    } catch (err) {
      console.error('Error in auto submit:', err)
      // If there's an error loading next flashcard, just clear states and try again
      setError(null)
      setFollowUpQuestion(null)
      setSelectedOption(null)
      setSubmitResult(null)
      loadFlashcard()
    } finally {
      setLoading(false)
    }
  }, [loadFlashcard])

  // Timer countdown for follow-up question - 60 seconds
  useEffect(() => {
    if (!followUpQuestion || !followUpTimerActive || submitResult || followUpTimer <= 0) {
      return
    }

    const timer = setInterval(() => {
      setFollowUpTimer((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit with no answer (marks as wrong)
          setFollowUpTimerActive(false)
          setFollowUpTimerStartTime(null)
          // Call handleAutoSubmitAnswer asynchronously to ensure it executes
          setTimeout(() => {
            handleAutoSubmitAnswer().catch(err => {
              console.error('Error in auto submit:', err)
              // Fallback: manually move to next flashcard
              if (currentFlashcard) {
                setIncorrectCount((prev) => prev + 1)
                const newCount = flashcardCount + 1
                setFlashcardCount(newCount)
                if (newCount >= 6) {
                  setShowContinuePrompt(true)
                  const completionTime = Date.now()
                  localStorage.setItem('hasAttemptedFlashcard', 'true')
                  localStorage.setItem('batchCompletionTime', completionTime.toString())
                  setHasBatchCompletionTime(true)
                  const token = getAuthToken()
                  if (token) {
                    completeBatch(token, completionTime).catch(err => {
                      console.error('Error storing batch completion time:', err)
                    })
                  }
                  setBatchFlashcards([])
                  setCurrentBatchIndex(0)
                } else {
                  setFollowUpQuestion(null)
                  setSelectedOption(null)
                  setSubmitResult(null)
                  loadFlashcard()
                }
              }
            })
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [followUpQuestion, followUpTimerActive, submitResult, followUpTimer, handleAutoSubmitAnswer, currentFlashcard, flashcardCount, loadFlashcard])

  const handleRating = async (ratingValue: number) => {
    if (hasRated || !timerActive) return // Prevent rating after timeout
    
    setHasRated(true)
    setRating(ratingValue)
    setShowAnswer(true)
    setTimerActive(false)
    setTimerStartTime(null)
    await submitRating(ratingValue)
  }

  const handleSubmitAnswer = async () => {
    if (!followUpQuestion || !selectedOption || !currentFlashcard) return

    // Stop timer when user submits manually
    setFollowUpTimerActive(false)
    setFollowUpTimerStartTime(null)
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

      // Track score
      if (data.correct) {
        setCorrectCount((prev) => prev + 1)
      } else {
        setIncorrectCount((prev) => prev + 1)
      }

      // Store individual result
      const result = {
        flashcardQuestion: currentFlashcard.flashcard,
        flashcardAnswer: currentFlashcard.flashcardAnswer || '',
        followUpQuestion: followUpQuestion.question,
        followUpOptions: followUpQuestion.options,
        selectedOption: selectedOption,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        correct: data.correct,
        difficulty: difficulty || 'medium',
        topic: currentFlashcard.topic
      }
      setFlashcardResults((prev) => [...prev, result])

      // Mark subtopic as completed
      if (currentFlashcard.subTopic && !completedSubtopics.includes(currentFlashcard.subTopic)) {
        setCompletedSubtopics([...completedSubtopics, currentFlashcard.subTopic])
      }

      // Increment flashcard count
      const newCount = flashcardCount + 1
      setFlashcardCount(newCount)

      // If we've completed 6 flashcards, show continue prompt and start day shift timer
      if (newCount >= 6) {
        setShowContinuePrompt(true)
        // Start day shift timer after completing batch of 6 flashcards
        const completionTime = Date.now()
        localStorage.setItem('hasAttemptedFlashcard', 'true')
        localStorage.setItem('batchCompletionTime', completionTime.toString())
        setHasBatchCompletionTime(true)
        
        // Store batch completion time on backend
        const token = getAuthToken()
        if (token) {
          try {
            await completeBatch(token, completionTime)
          } catch (err) {
            // Silently fail - backend might not be available, but frontend timer will still work
            console.error('Error storing batch completion time:', err)
          }
        }
        
        // Clear batch flashcards state
        setBatchFlashcards([])
        setCurrentBatchIndex(0)
        
        // Dispatch custom event to notify Navbar immediately
        window.dispatchEvent(new Event('flashcardAttempted'))
        // Clear follow-up question state - result will be shown, user can view summary
        setFollowUpQuestion(null)
        setSelectedOption(null)
        setError(null)
        // Don't load next flashcard - session is complete
        return
      }
      
      // Clear follow-up question state - result will be shown, user clicks "Next Flashcard" to proceed
      setFollowUpQuestion(null)
      setSelectedOption(null)
      setError(null)
      // Don't automatically load next flashcard - wait for user to click "Next Flashcard" button
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  const handleNextFlashcard = () => {
    // Don't load next flashcard if continue prompt is showing
    if (showContinuePrompt) {
      return
    }
    // Clear result state and reset all necessary states before loading next flashcard
    setSubmitResult(null)
    setFollowUpQuestion(null)
    setSelectedOption(null)
    setError(null)
    // Reset follow-up timer state
    setFollowUpTimer(60)
    setFollowUpTimerActive(false)
    setFollowUpTimerStartTime(null)
    // Load next flashcard
    loadFlashcard()
  }

  const handleGoToHome = () => {
    // Calculate accuracy based on actual answered questions
    const total = correctCount + incorrectCount
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
    
    // Store accuracy data in localStorage
    const accuracyData = {
      accuracy,
      correct: correctCount,
      incorrect: incorrectCount,
      total: total || 6, // Use actual total, fallback to 6 if no answers yet
      timestamp: Date.now()
    }
    localStorage.setItem('flashcardSessionAccuracy', JSON.stringify(accuracyData))
    
    // Clear persisted flashcard progress when session completes
    localStorage.removeItem(FLASHCARD_STORAGE_KEY)
    
    // Navigate to home page with accuracy data
    navigate('/', { state: accuracyData })
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

  // Show start screen if session is initialized but user hasn't started yet
  if (!hasStarted && sessionSubtopics.length > 0 && !currentFlashcard) {
    return (
      <div className={`flashcard-system ${className}`}>
        <div style={{
          background: 'white',
          padding: '48px 32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '16px',
            color: '#0369a1'
          }}>
            Ready to Start?
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#64748b',
            marginBottom: '32px',
            lineHeight: 1.6
          }}>
            You'll complete 6 flashcards in this session. Each flashcard includes a concept review and a follow-up question to test your understanding.
          </p>
          <button
            className="btn"
            onClick={() => {
              setHasStarted(true)
              loadFlashcard()
            }}
            style={{
              background: '#0369a1',
              color: 'white',
              border: 'none',
              fontSize: '20px',
              padding: '16px 48px',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0284c7'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0369a1'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Start Flashcards
          </button>
        </div>
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
      {/* Cooldown Timer - Display at top when batch is completed OR during active session */}
      {(showContinuePrompt || (cooldownTimerActive && hasBatchCompletionTime)) && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: showContinuePrompt ? '12px' : '0'
          }}>
            <FaClock style={{ fontSize: '24px', color: '#d97706' }} />
            <div>
              <p style={{
                fontSize: '14px',
                color: '#92400e',
                margin: 0,
                fontWeight: 600,
                marginBottom: '4px'
              }}>
                Next Batch Available In:
              </p>
              <p style={{
                fontSize: '32px',
                color: '#d97706',
                margin: 0,
                fontWeight: 700,
                fontFamily: 'monospace'
              }}>
                {cooldownTimeRemaining}
              </p>
            </div>
          </div>
          {showContinuePrompt && (
            <button
              className="btn"
              onClick={handleStartNewBatch}
              disabled={cooldownTimeRemaining !== '00:00' || loading}
              style={{
                background: cooldownTimeRemaining === '00:00' ? '#059669' : '#9ca3af',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: cooldownTimeRemaining === '00:00' && !loading ? 'pointer' : 'not-allowed',
                opacity: cooldownTimeRemaining === '00:00' && !loading ? 1 : 0.6,
                transition: 'all 0.2s',
                width: '100%',
                maxWidth: '300px',
                marginTop: '12px'
              }}
              onMouseEnter={(e) => {
                if (cooldownTimeRemaining === '00:00' && !loading) {
                  e.currentTarget.style.background = '#047857'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (cooldownTimeRemaining === '00:00' && !loading) {
                  e.currentTarget.style.background = '#059669'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {loading ? 'Loading...' : cooldownTimeRemaining === '00:00' ? 'Start New Batch' : 'Wait for Timer'}
            </button>
          )}
        </div>
      )}

      {/* Session Progress */}
      {sessionSubtopics.length > 0 && !showContinuePrompt && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          background: '#f0f9ff', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
            Session Progress: {flashcardCount} / 6 flashcards completed
          </p>
        </div>
      )}

      {currentFlashcard && !followUpQuestion && (
        <div className="flashcard-card">
          {/* Cooldown Timer on Flashcard Card - Show when batch completion time exists */}
          {cooldownTimerActive && hasBatchCompletionTime && !showContinuePrompt && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <FaClock style={{ fontSize: '18px', color: '#d97706' }} />
                <span style={{
                  fontSize: '12px',
                  color: '#92400e',
                  fontWeight: 600,
                  marginRight: '8px'
                }}>
                  Next Batch Available In:
                </span>
                <span style={{
                  fontSize: '20px',
                  color: '#d97706',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  {cooldownTimeRemaining}
                </span>
              </div>
            </div>
          )}

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

          {/* Hint (shown before answer reveal) */}
          {!showAnswer && timerActive && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => {
                  setShowHint(!showHint)
                }}
                style={{
                  background: 'none',
                  border: '2px solid #f59e0b',
                  color: '#d97706',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fffbeb'
                  e.currentTarget.style.borderColor = '#d97706'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.borderColor = '#f59e0b'
                }}
              >
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              {showHint && currentFlashcard.flashcardAnswer && (
                <div style={{ 
                  background: '#fffbeb', 
                  border: '2px solid #f59e0b',
                  padding: '24px', 
                  borderRadius: '12px',
                  marginTop: '12px'
                }}>
                  <h3 style={{ color: '#d97706', marginBottom: '12px', fontSize: '18px' }}>
                    Hint:
                  </h3>
                  {renderText(currentFlashcard.flashcardAnswer)}
                </div>
              )}
            </div>
          )}

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

          {/* Timer for follow-up question */}
          {followUpTimerActive && (
            <div className="quiz-timer" style={{ 
              marginBottom: '20px',
              alignItems: 'center',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span className="quiz-timer-label">Time Left</span>
              <span className={`quiz-timer-value ${followUpTimer <= 10 ? 'danger' : ''}`}>
                {followUpTimer}s
              </span>
            </div>
          )}

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

      {/* Submit Result - Always show immediately after submission, even for correct answers */}
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

          <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px' }}>
            Correct Answer: <strong>{submitResult.correctAnswer}</strong>
          </p>

          <div style={{ 
            background: '#f9fafb', 
            padding: '20px', 
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
              Explanation:
            </h4>
            {renderText(submitResult.explanation || 'No explanation available.')}
          </div>

          {showContinuePrompt ? (
            <button
              className="btn"
              onClick={() => {
                // Scroll to summary section
                const summaryElement = document.querySelector('.continue-prompt')
                if (summaryElement) {
                  summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              style={{ width: '100%' }}
            >
              View Session Summary
            </button>
          ) : (
            <button
              className="btn"
              onClick={handleNextFlashcard}
              style={{ width: '100%' }}
            >
              Next Flashcard
            </button>
          )}
        </div>
      )}

      {/* All Completed Questions with Explanations - Only show after all 6 cards are completed */}
      {flashcardResults.length > 0 && showContinuePrompt && (
        <div style={{
          marginTop: '32px',
          marginBottom: '32px',
          padding: '24px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '20px',
            color: '#0369a1',
            textAlign: 'center',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '12px'
          }}>
            Completed Questions ({flashcardResults.length})
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {flashcardResults.map((result, idx) => (
              <div
                key={idx}
                style={{
                  background: result.correct ? '#ecfdf5' : '#fef2f2',
                  border: `2px solid ${result.correct ? '#059669' : '#dc2626'}`,
                  padding: '16px',
                  borderRadius: '12px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: result.correct ? '#059669' : '#dc2626'
                    }}>
                      Question {idx + 1}
                    </span>
                    <span style={{
                      background: result.correct ? '#059669' : '#dc2626',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {result.difficulty}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: result.correct ? '#059669' : '#dc2626'
                  }}>
                    {result.correct ? <FaCheckCircle /> : <FaTimesCircle />}
                  </div>
                </div>

                {/* Follow-up Question */}
                <div style={{ marginBottom: '10px' }}>
                  <h5 style={{
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748b'
                  }}>
                    Question:
                  </h5>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '8px' }}>
                    {renderText(result.followUpQuestion)}
                  </div>
                </div>

                {/* Answer Selection */}
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>
                    Your Answer: <span style={{ color: result.correct ? '#059669' : '#dc2626' }}>
                      {result.selectedOption || 'No answer selected'}
                    </span>
                  </p>
                  <p style={{ fontSize: '13px', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>
                    Correct Answer: <span style={{ color: '#059669' }}>
                      {result.correctAnswer}
                    </span>
                  </p>
                </div>

                {/* Explanation */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h5 style={{
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748b'
                  }}>
                    Explanation:
                  </h5>
                  <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                    {renderText(result.explanation || 'No explanation available.')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Complete - Stats Summary */}
      {showContinuePrompt && (flashcardResults.length === 6 || submitResult) && (() => {
        const total = correctCount + incorrectCount || flashcardResults.length || 6
        const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
        
        return (
          <div className="continue-prompt" style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <h2 style={{ 
              fontSize: '28px', 
              marginBottom: '24px',
              color: '#0369a1',
              fontWeight: 700
            }}>
              Session Complete! 🎉
            </h2>

            {/* Stats Summary */}
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '2px solid #0369a1'
            }}>
              <div style={{
                fontSize: '64px',
                fontWeight: 700,
                color: accuracy >= 70 ? '#059669' : accuracy >= 50 ? '#f59e0b' : '#dc2626',
                marginBottom: '8px'
              }}>
                {accuracy}%
              </div>
              <div style={{
                fontSize: '18px',
                color: '#0369a1',
                fontWeight: 600,
                marginBottom: '20px'
              }}>
                Accuracy
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '20px'
              }}>
                <div style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#0369a1',
                    marginBottom: '4px'
                  }}>
                    {total}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    Total
                  </div>
                </div>
                <div style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#059669',
                    marginBottom: '4px'
                  }}>
                    {correctCount}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    Correct
                  </div>
                </div>
                <div style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#dc2626',
                    marginBottom: '4px'
                  }}>
                    {incorrectCount}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    Incorrect
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Results for All Cards */}
            {flashcardResults.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#0369a1',
                  textAlign: 'center'
                }}>
                  Individual Results
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {flashcardResults.map((result, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        background: result.correct ? '#ecfdf5' : '#fef2f2', 
                        border: `2px solid ${result.correct ? '#059669' : '#dc2626'}`,
                        padding: '20px', 
                        borderRadius: '12px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '18px', 
                            fontWeight: 700,
                            color: result.correct ? '#059669' : '#dc2626'
                          }}>
                            Card {idx + 1}
                          </span>
                          <span style={{ 
                            background: result.correct ? '#059669' : '#dc2626',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            {result.difficulty}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '24px',
                          color: result.correct ? '#059669' : '#dc2626'
                        }}>
                          {result.correct ? <FaCheckCircle /> : <FaTimesCircle />}
                        </div>
                      </div>

                      {/* Flashcard Question */}
                      <div style={{ marginBottom: '12px' }}>
                        <h5 style={{ 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: '#64748b'
                        }}>
                          Flashcard:
                        </h5>
                        <div style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                          {renderText(result.flashcardQuestion)}
                        </div>
                        {result.flashcardAnswer && (
                          <div style={{
                            background: '#ecfdf5',
                            border: '1px solid #059669',
                            padding: '12px',
                            borderRadius: '8px',
                            marginTop: '8px'
                          }}>
                            <h6 style={{
                              marginBottom: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#059669'
                            }}>
                              Answer:
                            </h6>
                            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                              {renderText(result.flashcardAnswer)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Question */}
                      <div style={{ marginBottom: '12px' }}>
                        <h5 style={{ 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: '#64748b'
                        }}>
                          Follow-up Question:
                        </h5>
                        <div style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                          {renderText(result.followUpQuestion)}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          {Object.entries(result.followUpOptions).map(([key, value]) => {
                            const isCorrect = result.correctAnswer === `Option ${key}`
                            const isSelected = result.selectedOption === `Option ${key}`
                            return (
                              <div
                                key={key}
                                style={{
                                  padding: '8px 12px',
                                  marginBottom: '6px',
                                  borderRadius: '6px',
                                  background: isCorrect ? '#ecfdf5' : isSelected ? '#fef2f2' : '#f9fafb',
                                  border: isCorrect ? '2px solid #059669' : isSelected ? '2px solid #dc2626' : '1px solid #e5e7eb',
                                  fontWeight: isCorrect ? 700 : isSelected ? 600 : 400,
                                  color: isCorrect ? '#059669' : isSelected ? '#dc2626' : '#374151'
                                }}
                              >
                                <strong>Option {key}:</strong> {renderText(value)}
                                {isCorrect && ' ✓ (Correct Answer)'}
                                {isSelected && !isCorrect && ' (Your Choice)'}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <h5 style={{ 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 600,
                          color: '#64748b'
                        }}>
                          Explanation:
                        </h5>
                        <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                          {renderText(result.explanation || 'No explanation available.')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn"
              onClick={handleGoToHome}
              style={{ 
                width: '100%',
                background: '#0369a1',
                color: 'white',
                border: 'none',
                fontSize: '18px',
                padding: '14px 28px',
                fontWeight: 600
              }}
            >
              Go to Home
            </button>
          </div>
        )
      })()}

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

