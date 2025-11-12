import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTopics } from '../api/client'
import type { Topic } from '../api/client'
import MathBlock from '../components/MathBlock'
import Loader from '../components/Loader'

export default function Rate() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<number | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timer, setTimer] = useState(60)
  const [warningCountdown, setWarningCountdown] = useState(5)
  const [showWarning, setShowWarning] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const timerStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchTopics()
      .then(topics => {
        if (!topics || topics.length === 0) {
          console.error('No topics returned from API')
          setError('No topics available. The backend may be starting up. Please try again in a moment.')
          setLoading(false)
          return
        }
        // Try exact match first, then case-insensitive
        let found = topics.find(t => t.id === topicId)
        if (!found && topicId) {
          found = topics.find(t => t.id.toLowerCase() === topicId.toLowerCase())
        }
        if (found) {
          setTopic(found)
          setError(null)
          // Start timer when topic is loaded
          timerStartTimeRef.current = Date.now()
        } else {
          console.error(`Topic with id "${topicId}" not found. Available topics:`, topics.map(t => t.id))
          setError(`Topic "${topicId}" not found. Available topics: ${topics.map(t => t.id).join(', ')}`)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching topics:', err)
        const errorMessage = err.message || 'Unknown error'
        if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
          setError('Network timeout. The backend server may be starting up (this can take 10-30 seconds on Render). Please wait a moment and refresh the page.')
        } else {
          setError(`Failed to fetch topics: ${errorMessage}`)
        }
        setLoading(false)
      })
  }, [topicId])

  // Main 60-second timer
  useEffect(() => {
    if (loading || selected !== null || isBlocked) return

    const interval = setInterval(() => {
      if (!timerStartTimeRef.current) return
      
      const elapsed = Math.floor((Date.now() - timerStartTimeRef.current) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      
      setTimer(remaining)
      
      if (remaining <= 0 && selected === null) {
        clearInterval(interval)
        setShowWarning(true)
        setWarningCountdown(5)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [loading, selected, isBlocked])

  // 5-second warning countdown
  useEffect(() => {
    if (!showWarning || selected !== null || isBlocked) return

    const interval = setInterval(() => {
      setWarningCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsBlocked(true)
          // Navigate away or show error - user can't proceed
          setTimeout(() => {
            navigate('/')
          }, 1000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showWarning, selected, isBlocked, navigate])

  // Reset timer when user selects a rating
  useEffect(() => {
    if (selected !== null) {
      setShowWarning(false)
      setWarningCountdown(5)
      setIsBlocked(false)
    }
  }, [selected])

  useEffect(() => {
    if (selected && topicId && !isBlocked) {
      const timer = setTimeout(() => {
        navigate(`/guidelines/${topicId}/${selected}`)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [selected, navigate, topicId, isBlocked])

  const renderText = (text: string) => {
    const parts = text.split(/(\$[^$]+\$)/g)
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            // Prevent KaTeX warnings by avoiding unsupported ₹ inside math
            const sanitized = part
              .slice(1, -1)
              .replace(/₹/g, 'Rs.')
            return <MathBlock key={idx} math={sanitized} inline={true} />
          }
          return <span key={idx}>{part}</span>
        })}
      </>
    )
  }

  if (loading) return <Loader message="Loading topic..." />
  if (!topic || error) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div className="card card-accent" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: 16 }}>
            {error && error.includes('timeout') ? 'Connection Timeout' : 'Topic not found'}
          </h2>
          {error ? (
            <>
              <p className="muted" style={{ marginBottom: 16, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                {error}
              </p>
              {error.includes('timeout') && (
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffc107',
                  borderRadius: 6,
                  marginBottom: 16,
                  textAlign: 'left'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                    <strong>💡 Tip:</strong> Render free tier services can take 10-30 seconds to start if they've been idle. 
                    Try refreshing the page in a few moments.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 16 }}>
                The topic "{topicId}" could not be found. This might be because:
              </p>
              <ul style={{ textAlign: 'left', display: 'inline-block', marginBottom: 16 }}>
                <li>The backend server is not running</li>
                <li>The topic ID is incorrect</li>
                <li>There was a network error</li>
              </ul>
            </>
          )}
          <p className="muted" style={{ fontSize: '14px', marginTop: 16 }}>
            Please check the browser console for more details.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button 
              className="btn" 
              onClick={() => window.location.href = '/'}
              style={{ backgroundColor: '#f8f9fa', color: '#333' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div className="card card-accent" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 24, margin: 0, color: 'var(--accent)' }}>{topic.name}</h2>
          {!loading && selected === null && !isBlocked && (
            <span className="pill" style={{ fontSize: 14, fontWeight: 600 }}>
              {timer}s
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: '#555', marginBottom: 12 }}>
          {renderText(topic.description)}
        </div>
        {topic.hint && (
          <div style={{ 
            fontSize: 13, 
            padding: '8px 12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6,
            color: '#666',
            borderLeft: '3px solid #8b1538'
          }}>
            <strong>Hint:</strong> {renderText(topic.hint)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>How well do you know this topic?</h2>
        <p className="muted">1 = I don't know, 5 = I know very well</p>
        
        {showWarning && selected === null && !isBlocked && (
          <div style={{
            marginTop: 20,
            padding: '16px 24px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: 8,
            color: '#856404',
            textAlign: 'center',
            maxWidth: 500,
            width: '100%'
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 16 }}>
              ⚠️ Warning
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>
              You haven't selected anything. Please select in next {warningCountdown} seconds or else you can't able to write the quiz.
            </p>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: 'var(--accent)',
              marginTop: 8
            }}>
              {warningCountdown}
            </div>
          </div>
        )}

        {isBlocked && (
          <div style={{
            marginTop: 20,
            padding: '16px 24px',
            backgroundColor: '#f8d7da',
            border: '2px solid #dc3545',
            borderRadius: 8,
            color: '#721c24',
            textAlign: 'center',
            maxWidth: 500,
            width: '100%'
          }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
              Access Denied
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              You didn't select a rating in time. Redirecting to home...
            </p>
          </div>
        )}

        <div className="rating-row" style={{ marginTop: 18 }}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              className={`rating-dot ${selected === n ? 'selected' : ''}`}
              onClick={() => setSelected(n)}
              aria-label={`Rate ${n}`}
              disabled={isBlocked}
              style={{ opacity: isBlocked ? 0.5 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


