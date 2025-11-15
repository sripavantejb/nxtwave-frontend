import { useState } from 'react'
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
import { useEffect } from 'react'
import { pingHealth } from './api/client'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const { isAuthenticated, user, logout } = useAuth()

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
              href="#learn-concepts"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('learn-concepts')
              }}
            >
              Learn Concepts
            </a>
          ) : (
            <Link className="nav-link" to="/conceptual-guidelines" onClick={closeMenu}>
              Learn Concepts
            </Link>
          )}
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
