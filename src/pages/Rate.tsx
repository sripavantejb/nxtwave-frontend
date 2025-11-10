import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTopics } from '../api/client'
import type { Topic } from '../api/client'
import MathBlock from '../components/MathBlock'

export default function Rate() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<number | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(60)
  const [warningCountdown, setWarningCountdown] = useState(5)
  const [showWarning, setShowWarning] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const timerStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    fetchTopics()
      .then(topics => {
        const found = topics.find(t => t.id === topicId)
        if (found) setTopic(found)
        setLoading(false)
        // Start timer when topic is loaded
        timerStartTimeRef.current = Date.now()
      })
      .catch(() => setLoading(false))
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
            return <MathBlock key={idx} math={part.slice(1, -1)} inline={true} />
          }
          return <span key={idx}>{part}</span>
        })}
      </>
    )
  }

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading...</p>
  if (!topic) return <p className="muted" style={{ padding: 24 }}>Topic not found.</p>

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


