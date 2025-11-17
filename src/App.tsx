import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastContainer } from 'react-toastify'
import Home from './pages/Home'
import About from './pages/About'
import Rate from './pages/Rate'
import Guidelines from './pages/Guidelines'
import ConceptualGuidelines from './pages/ConceptualGuidelines'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Login from './pages/Login'
import Register from './pages/Register'
import ConceptualQuizFlow from './components/ConceptualQuizFlow'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import 'katex/dist/katex.min.css'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import './index.css'
import { pingHealth } from './api/client'

function DayShiftTimer({ shouldStart = false }: { shouldStart?: boolean }) {
  // Initialize timer state from localStorage if available (lazy initializer)
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (typeof window === 'undefined') return '00:00'
    const batchCompletionTimeStr = localStorage.getItem('batchCompletionTime')
    if (batchCompletionTimeStr) {
      const completionTime = parseInt(batchCompletionTimeStr, 10)
      if (!isNaN(completionTime)) {
        const targetTime = completionTime + (5 * 60 * 1000)
        const now = Date.now()
        const remaining = targetTime - now
        if (remaining > 0) {
          const totalSeconds = Math.max(0, Math.floor(remaining / 1000))
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        }
      }
    }
    return '00:00'
  })
  const intervalRef = useRef<number | null>(null)
  const hasDispatchedRef = useRef<boolean>(false)

  useEffect(() => {
    // Only start timer if shouldStart is true
    if (!shouldStart) {
      setTimeRemaining('00:00')
      hasDispatchedRef.current = false
      // Clear any existing interval
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check for existing batchCompletionTime from localStorage
    const batchCompletionTimeStr = localStorage.getItem('batchCompletionTime')
    let targetTime: number | null = null

    if (batchCompletionTimeStr) {
      const completionTime = parseInt(batchCompletionTimeStr, 10)
      if (!isNaN(completionTime)) {
        // Calculate target time: completion time + 5 minutes
        targetTime = completionTime + (5 * 60 * 1000)
      }
    }

    const calculateTimeString = (remainingMs: number): string => {
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    const updateTimer = () => {
      const now = Date.now()
      
      if (targetTime !== null) {
        // Use persisted batch completion time
        const remaining = targetTime - now
        
        if (remaining <= 0) {
          // Timer already completed
          setTimeRemaining('00:00')
          
          // Dispatch day shift completion event if we haven't already
          if (!hasDispatchedRef.current) {
            hasDispatchedRef.current = true
            localStorage.setItem('dayShiftCompleted', 'true')
            localStorage.setItem('dayShiftCompletedTime', Date.now().toString())
            window.dispatchEvent(new Event('dayShiftCompleted'))
          }
        } else {
          const timeString = calculateTimeString(remaining)
          setTimeRemaining(timeString)
          
          // Reset dispatch flag if timer is not at 00:00
          if (timeString !== '00:00') {
            hasDispatchedRef.current = false
          }
        }
      } else {
        // No existing timer, use calculateNextDayShift() logic
        const nowDate = new Date()
        const currentMinutes = nowDate.getMinutes()
        
        // Calculate next 5-minute interval
        let nextIntervalMinutes = Math.ceil((currentMinutes + 1) / 5) * 5
        
        const nextDayShift = new Date(nowDate)
        
        // Handle hour rollover
        if (nextIntervalMinutes >= 60) {
          nextDayShift.setHours(nextDayShift.getHours() + 1)
          nextIntervalMinutes = nextIntervalMinutes % 60
        }
        
        nextDayShift.setMinutes(nextIntervalMinutes)
        nextDayShift.setSeconds(0)
        nextDayShift.setMilliseconds(0)
        
        // If the calculated time is in the past (edge case), add 5 more minutes
        if (nextDayShift.getTime() <= now) {
          nextDayShift.setMinutes(nextDayShift.getMinutes() + 5)
        }
        
        const diff = nextDayShift.getTime() - now
        
        if (diff <= 0) {
          // Timer reached 0, recalculate for next interval
          const newNextDayShift = new Date(nextDayShift)
          newNextDayShift.setMinutes(newNextDayShift.getMinutes() + 5)
          const newDiff = newNextDayShift.getTime() - now
          setTimeRemaining(calculateTimeString(newDiff))
          
          // Dispatch day shift completion event if we haven't already
          if (!hasDispatchedRef.current) {
            hasDispatchedRef.current = true
            localStorage.setItem('dayShiftCompleted', 'true')
            localStorage.setItem('dayShiftCompletedTime', Date.now().toString())
            window.dispatchEvent(new Event('dayShiftCompleted'))
          }
        } else {
          const timeString = calculateTimeString(diff)
          setTimeRemaining(timeString)
          
          // Reset dispatch flag if timer is not at 00:00
          if (timeString !== '00:00') {
            hasDispatchedRef.current = false
          }
        }
      }
    }

    // Update immediately
    updateTimer()

    // Update every second
    intervalRef.current = window.setInterval(updateTimer, 1000)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [shouldStart])

  return (
    <div className="day-shift-timer">
      <span className="day-shift-label">Next Day Shift:</span>
      <span className="day-shift-time">{timeRemaining}</span>
    </div>
  )
}

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasAttemptedFlashcard, setHasAttemptedFlashcard] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const { isAuthenticated, user, logout } = useAuth()

  // Check if user has attempted flashcard
  useEffect(() => {
    const checkFlashcardAttempt = () => {
      const attempted = localStorage.getItem('hasAttemptedFlashcard') === 'true'
      setHasAttemptedFlashcard(attempted)
    }
    
    checkFlashcardAttempt()
    // Listen for storage changes (in case flag is set in another tab/component)
    window.addEventListener('storage', checkFlashcardAttempt)
    // Listen for custom event when flashcard is attempted in same tab
    window.addEventListener('flashcardAttempted', checkFlashcardAttempt)
    
    return () => {
      window.removeEventListener('storage', checkFlashcardAttempt)
      window.removeEventListener('flashcardAttempted', checkFlashcardAttempt)
    }
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const scrollToSection = (sectionId: string) => {
    closeMenu()
    if (isHomePage) {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleNavClick = (e: React.MouseEvent, sectionId: string, path?: string) => {
    if (isHomePage && !path) {
      e.preventDefault()
      scrollToSection(sectionId)
    } else {
      closeMenu()
    }
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {isAuthenticated && hasAttemptedFlashcard && (
          <DayShiftTimer shouldStart={true} />
        )}
        <Link 
          to="/" 
          className="brand" 
          onClick={(e: React.MouseEvent) => handleNavClick(e, 'home')}
        >
          <img 
            src="https://res.cloudinary.com/dqataciy5/image/upload/v1762799447/Screenshot_2025-11-11_at_12.00.06_AM_xiuruw.png" 
            alt="NxtQuiz logo" 
            className="brand-logo"
          />
          <span className="brand-name">NxtQuiz</span>
        </Link>
        <button 
          className="hamburger"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
        </button>
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <Link 
            className="nav-link" 
            to="/" 
            onClick={(e: React.MouseEvent) => handleNavClick(e, 'home')}
          >
            Home
          </Link>
          {isHomePage ? (
            <a 
              className="nav-link" 
              href="#about"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('about')
              }}
            >
              About
            </a>
          ) : (
            <Link className="nav-link" to="/about" onClick={closeMenu}>
              About
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <span className="nav-link" style={{ color: 'var(--text)', cursor: 'default' }}>
                {user?.name || 'User'}
              </span>
              <button
                className="nav-link nav-cta"
                onClick={() => {
                  logout()
                  closeMenu()
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link className="nav-link nav-cta" to="/login" onClick={closeMenu}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">NxtQuiz</h3>
            <p className="footer-description">
              Master mathematical concepts through adaptive quizzes. Test your knowledge and improve your skills.
            </p>
          </div>
          <div className="footer-section">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/">Get Started</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-heading">Topics</h4>
            <ul className="footer-links">
              <li><Link to="/rate/profit-loss">Profit and Loss</Link></li>
              <li><Link to="/rate/si-ci">Simple Interest & Compound Interest</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NxtQuiz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/rate/:topicId" element={<PageTransition><Rate /></PageTransition>} />
        <Route path="/guidelines/:topicId/:rating" element={<PageTransition><Guidelines /></PageTransition>} />
        <Route path="/conceptual-guidelines" element={<PageTransition><ConceptualGuidelines /></PageTransition>} />
        <Route path="/quiz/:topicId/:rating" element={<PageTransition><Quiz /></PageTransition>} />
        <Route path="/conceptual-learning" element={<PageTransition><ConceptualQuizFlow /></PageTransition>} />
        <Route path="/results" element={<PageTransition><Results /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function AppContent() {
  useEffect(() => {
    // Pre-warm backend on first load (Render cold start)
    pingHealth()
  }, [])
  return (
    <>
      <Navbar />
      <div className="main-content">
        <div className="container">
          <AppRoutes />
        </div>
      </div>
      <Footer />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
