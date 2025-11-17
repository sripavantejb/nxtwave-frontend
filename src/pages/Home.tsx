import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaLightbulb, FaChartLine, FaTrophy, FaTimes, FaCheckCircle } from 'react-icons/fa'
import FlashcardSystem from '../components/FlashcardSystem'
import { checkNewBatch, createNewBatch } from '../api/client'
import { getAuthToken } from '../contexts/AuthContext'

interface AccuracyData {
  accuracy: number
  correct: number
  incorrect: number
  total: number
  timestamp?: number
}

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null)
  const [showAccuracyPanel, setShowAccuracyPanel] = useState(false)
  const [showNewBatchNotification, setShowNewBatchNotification] = useState(false)
  const [newBatchMessage, setNewBatchMessage] = useState<string>('')

  // Handle accuracy data from navigation state or localStorage
  useEffect(() => {
    // Check navigation state first
    const stateData = location.state as AccuracyData | null
    if (stateData && stateData.accuracy !== undefined) {
      setAccuracyData(stateData)
      setShowAccuracyPanel(true)
      // Store in localStorage
      localStorage.setItem('flashcardSessionAccuracy', JSON.stringify({
        ...stateData,
        timestamp: Date.now()
      }))
      // Clear navigation state to prevent showing again on refresh
      window.history.replaceState({}, document.title)
    } else {
      // Check localStorage for recent accuracy data
      const stored = localStorage.getItem('flashcardSessionAccuracy')
      if (stored) {
        try {
          const data = JSON.parse(stored) as AccuracyData & { timestamp?: number }
          // Only show if data is less than 1 hour old
          if (data.timestamp && Date.now() - data.timestamp < 3600000) {
            setAccuracyData(data)
            setShowAccuracyPanel(true)
          } else {
            // Clear old data
            localStorage.removeItem('flashcardSessionAccuracy')
          }
        } catch (err) {
          console.error('Error parsing stored accuracy data:', err)
          localStorage.removeItem('flashcardSessionAccuracy')
        }
      }
    }
  }, [location.state])

  // Check for new batch availability using API
  useEffect(() => {
    const checkForNewBatch = async () => {
      const token = getAuthToken()
      if (!token) return

      try {
        const result = await checkNewBatch(token)
        if (result.available) {
          setShowNewBatchNotification(true)
          setNewBatchMessage(result.message || 'New batch available!')
        }
      } catch (err) {
        // Silently fail - user might not be logged in or endpoint might not be available
        console.error('Error checking new batch:', err)
      }
    }

    // Check on mount
    checkForNewBatch()

    // Set up interval to check every 30 seconds
    const intervalId = setInterval(checkForNewBatch, 30000)

    // Listen for day shift completion event
    const handleDayShiftCompleted = () => {
      checkForNewBatch()
    }

    window.addEventListener('dayShiftCompleted', handleDayShiftCompleted)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('dayShiftCompleted', handleDayShiftCompleted)
    }
  }, [])

  const handleDismissAccuracy = () => {
    setShowAccuracyPanel(false)
    localStorage.removeItem('flashcardSessionAccuracy')
  }

  const handleStartNewBatch = async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    try {
      // Create new batch via API
      await createNewBatch(token)
      setShowNewBatchNotification(false)
      setNewBatchMessage('')
      
      // Scroll to flashcard section and trigger new session
      const flashcardSection = document.getElementById('flashcard-learning')
      if (flashcardSection) {
        flashcardSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Dispatch event to trigger new session in FlashcardSystem
        window.dispatchEvent(new Event('startNewBatchAfterDayShift'))
      }
    } catch (err) {
      console.error('Error creating new batch:', err)
      setShowNewBatchNotification(false)
      // Still scroll to flashcard section
      const flashcardSection = document.getElementById('flashcard-learning')
      if (flashcardSection) {
        flashcardSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleDismissNewBatch = () => {
    setShowNewBatchNotification(false)
    localStorage.removeItem('dayShiftCompleted')
    localStorage.removeItem('dayShiftCompletedTime')
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      <div id="home" className="hero">
        <h1>Master Concepts with Interactive Flashcards</h1>
        <p>Learn, practice, and reinforce your knowledge with our adaptive flashcard system powered by spaced repetition.</p>
      </div>

      {/* New Batch Notification */}
      {showNewBatchNotification && (
        <section style={{ 
          marginTop: 32, 
          marginBottom: 32,
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            padding: '24px',
            borderRadius: '16px',
            border: '2px solid #059669',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              fontSize: '32px',
              color: '#059669',
              flexShrink: 0
            }}>
              <FaCheckCircle />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#059669',
                marginBottom: '8px'
              }}>
                New Batch Ready! 🎉
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#047857',
                margin: 0,
                lineHeight: 1.5
              }}>
                {newBatchMessage || 'Your day shift has completed. A new batch of flashcards is available, including questions you answered incorrectly in the previous session.'}
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexShrink: 0
            }}>
              <button
                onClick={handleStartNewBatch}
                style={{
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#047857'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#059669'
                }}
              >
                Start New Batch
              </button>
              <button
                onClick={handleDismissNewBatch}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#64748b',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                  e.currentTarget.style.color = '#059669'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = '#64748b'
                }}
                aria-label="Dismiss notification"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Accuracy Panel */}
      {showAccuracyPanel && accuracyData && (
        <section style={{ 
          marginTop: 32, 
          marginBottom: 32,
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            padding: '24px',
            borderRadius: '16px',
            border: '2px solid #0369a1',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <button
              onClick={handleDismissAccuracy}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                e.currentTarget.style.color = '#0369a1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#64748b'
              }}
              aria-label="Dismiss accuracy panel"
            >
              <FaTimes />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0369a1',
                marginBottom: '8px'
              }}>
                Your Last Session Performance
              </h2>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                textAlign: 'center',
                minWidth: '120px'
              }}>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: accuracyData.accuracy >= 70 ? '#059669' : accuracyData.accuracy >= 50 ? '#f59e0b' : '#dc2626',
                  marginBottom: '4px'
                }}>
                  {accuracyData.accuracy}%
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 600
                }}>
                  Accuracy
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <div style={{
                  textAlign: 'center',
                  background: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  minWidth: '100px'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#0369a1',
                    marginBottom: '4px'
                  }}>
                    {accuracyData.total}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    Total
                  </div>
                </div>
                <div style={{
                  textAlign: 'center',
                  background: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  minWidth: '100px'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#059669',
                    marginBottom: '4px'
                  }}>
                    {accuracyData.correct}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    Correct
                  </div>
                </div>
                <div style={{
                  textAlign: 'center',
                  background: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  minWidth: '100px'
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#dc2626',
                    marginBottom: '4px'
                  }}>
                    {accuracyData.incorrect}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    Incorrect
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              marginTop: '20px',
              background: 'white',
              borderRadius: '8px',
              padding: '4px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                height: '12px',
                background: accuracyData.accuracy >= 70 
                  ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
                  : accuracyData.accuracy >= 50
                  ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                  : 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
                borderRadius: '6px',
                width: `${accuracyData.accuracy}%`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </section>
      )}

      {/* Flashcard Learning Section */}
      <section id="flashcard-learning" style={{ marginTop: 48, marginBottom: 48, scrollMarginTop: '90px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          padding: '48px 40px',
          borderRadius: '20px',
          border: '2px solid rgba(153,27,27,0.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 800,
              marginBottom: '12px',
              color: 'var(--text)',
              letterSpacing: '-0.02em'
            }}>
              🎯 Adaptive Flashcard Learning
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-light)',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              Master concepts with our intelligent flashcard system featuring spaced repetition and adaptive follow-up questions
            </p>
          </div>

          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <FlashcardSystem />
          </div>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              maxWidth: '800px',
              width: '100%'
            }}>
              <div style={{
                background: 'rgba(153,27,27,0.05)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(153,27,27,0.1)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>30-Second Timer</div>
              </div>
              <div style={{
                background: 'rgba(153,27,27,0.05)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(153,27,27,0.1)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Self-Rating System</div>
              </div>
              <div style={{
                background: 'rgba(153,27,27,0.05)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(153,27,27,0.1)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎲</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Adaptive Questions</div>
              </div>
              <div style={{
                background: 'rgba(153,27,27,0.05)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(153,27,27,0.1)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Spaced Repetition</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ 
        marginTop: 80, 
        marginBottom: 60,
        scrollMarginTop: '90px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            marginBottom: '16px',
            color: 'var(--text)',
            letterSpacing: '-0.02em'
          }}>
            About NxtQuiz
          </h2>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Empowering learners with adaptive, intelligent quizzes designed to accelerate your mathematical journey.
          </p>
        </div>

        <div className="grid" style={{ gap: 32, marginBottom: 40 }}>
          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaLightbulb />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Adaptive Learning
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Questions adapt to your skill level, ensuring you're always challenged at the right difficulty.
              </p>
            </div>
          </div>

          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaChartLine />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Track Progress
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Monitor your performance and improvement over time with detailed analytics and insights.
              </p>
            </div>
          </div>

          <div className="col-4">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              background: 'var(--white)',
              borderRadius: '16px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid rgba(153,27,27,0.08)',
              transition: 'var(--transition)',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--card-shadow)'
            }}>
              <div style={{
                fontSize: '48px',
                color: 'var(--accent)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <FaTrophy />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                Master Concepts
              </h3>
              <p style={{
                color: 'var(--muted)',
                fontSize: '15px',
                lineHeight: 1.6
              }}>
                Build strong foundations in mathematics through carefully curated problems and explanations.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(153,27,27,0.05) 0%, rgba(185,28,28,0.03) 100%)',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid rgba(153,27,27,0.1)'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '16px',
            color: 'var(--text)',
            textAlign: 'center'
          }}>
            Why Choose NxtQuiz?
          </h3>
          <p style={{
            color: 'var(--text-light)',
            fontSize: '16px',
            lineHeight: 1.8,
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            NxtQuiz combines cutting-edge adaptive learning algorithms with expertly crafted content to create 
            a personalized learning experience. Whether you're a beginner or looking to sharpen your skills, 
            our platform adjusts to your level and helps you progress at your own pace. Start your journey 
            today and discover a smarter way to learn mathematics.
          </p>
        </div>
      </section>
    </div>
  )
}


