import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ConceptualGuidelines() {
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)

  const handleStartLearning = () => {
    if (accepted) {
      // Store acceptance in localStorage
      localStorage.setItem('conceptual_guidelines_accepted', 'true')
      navigate('/conceptual-learning')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div className="card card-accent" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 20, color: 'var(--accent)', textAlign: 'center' }}>
          Master the Fundamentals - Guidelines
        </h1>
        
        <div style={{ fontSize: 15, lineHeight: 1.8, color: '#555' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 12, color: 'var(--accent)' }}>
              📋 Instructions
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 10 }}>
                You will go through <strong>6 key concepts</strong> one by one.
              </li>
              <li style={{ marginBottom: 10 }}>
                Each concept is followed by a <strong>practice question</strong>.
              </li>
              <li style={{ marginBottom: 10 }}>
                You will have <strong>60 seconds</strong> to answer each practice question.
              </li>
              <li style={{ marginBottom: 10 }}>
                Rate your understanding (1-5) to get questions matched to your level.
              </li>
              <li style={{ marginBottom: 10 }}>
                You can submit your answer or skip to the next concept.
              </li>
              <li style={{ marginBottom: 10 }}>
                If time runs out, your current answer (if any) will be automatically submitted.
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 12, color: 'var(--accent)' }}>
              ⚠️ Important Rules
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 10 }}>
                <strong>Do not use the browser back button</strong> during the session.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>Do not refresh the page</strong> as your progress will be lost.
              </li>
              <li style={{ marginBottom: 10 }}>
                The session will automatically enter <strong>fullscreen mode</strong> when you start.
              </li>
            </ul>
          </div>

          <div style={{ 
            marginBottom: 20, 
            padding: '16px', 
            backgroundColor: '#fff3cd', 
            borderRadius: 8,
            borderLeft: '4px solid #ffc107'
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#856404', fontWeight: 500 }}>
              <strong>Note:</strong> Your progress is automatically saved. If you accidentally close the browser, you can resume from where you left off when you return (within the time limit for practice questions).
            </p>
          </div>

          <div style={{ 
            marginTop: 30,
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            border: '2px solid #dee2e6'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              cursor: 'pointer',
              gap: 12
            }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{
                  marginTop: 4,
                  width: 20,
                  height: 20,
                  cursor: 'pointer',
                  accentColor: 'var(--accent)'
                }}
              />
              <span style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
                I have read and understood all the guidelines and rules mentioned above. I agree to follow them during the learning session.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <button
              className="btn btn-primary"
              onClick={handleStartLearning}
              disabled={!accepted}
              style={{
                padding: '14px 40px',
                fontSize: 16,
                fontWeight: 600,
                minWidth: 200,
                opacity: accepted ? 1 : 0.6,
                cursor: accepted ? 'pointer' : 'not-allowed'
              }}
            >
              Start Learning Path
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

