import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { renderText } from '../components/renderText'

type Detail = {
  questionId: string
  selectedIndex: number | null
  correctIndex: number
  explanation: string
  question: string
  options: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

type ResultsState = {
  score: number
  total: number
  details: Detail[]
  timestamp?: number
}

const RESULTS_STORAGE_KEY = 'nxtquiz_lastResults'

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resultsState, setResultsState] = useState<ResultsState | null>(null)

  useEffect(() => {
    // First, check if we have state from navigation
    const navigationState = location.state as ResultsState | null
    
    if (navigationState && navigationState.score !== undefined) {
      // Save to localStorage when received via navigation
      const stateToSave: ResultsState = {
        ...navigationState,
        timestamp: Date.now()
      }
      localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(stateToSave))
      setResultsState(navigationState)
      // Clear navigation state to prevent showing again on refresh
      window.history.replaceState({}, document.title)
    } else {
      // Check localStorage if location.state is missing (e.g., on refresh)
      const stored = localStorage.getItem(RESULTS_STORAGE_KEY)
      if (stored) {
        try {
          const data = JSON.parse(stored) as ResultsState
          // Only restore if data is less than 24 hours old
          if (data.timestamp && Date.now() - data.timestamp < 86400000) {
            setResultsState(data)
          } else {
            // Clear old data
            localStorage.removeItem(RESULTS_STORAGE_KEY)
          }
        } catch (err) {
          console.error('Error parsing stored results data:', err)
          localStorage.removeItem(RESULTS_STORAGE_KEY)
        }
      }
    }
  }, [location.state])

  if (!resultsState) {
    return (
      <div style={{ padding: 24 }}>
        <div className="card">
          <p className="muted">No results to display.</p>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    )
  }

  const { score, total, details } = resultsState

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>Score: {score} / {total}</h2>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {details.map((d, idx) => {
          const correct = d.selectedIndex === d.correctIndex
          return (
            <div key={d.questionId} className={`card result-item ${correct ? 'result-correct' : 'result-incorrect'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Q{idx + 1} ({d.difficulty})</strong>
                <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {correct ? (
                    <>
                      <FaCheck style={{ color: '#16a34a' }} /> Correct
                    </>
                  ) : (
                    <>
                      <FaTimes style={{ color: '#991B1B' }} /> Incorrect
                    </>
                  )}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>{renderText(d.question)}</div>
              <ol style={{ marginTop: 6, paddingLeft: 18 }}>
                {d.options.map((opt, i) => (
                  <li key={i} style={{
                    fontWeight: i === d.correctIndex ? 700 : 400,
                    color: i === d.correctIndex ? 'var(--accent)' : undefined
                  }}>
                    {renderText(opt)} {i === d.correctIndex ? '(answer)' : ''}
                    {d.selectedIndex === i && i !== d.correctIndex ? ' — your choice' : ''}
                  </li>
                ))}
              </ol>
              <div className="muted" style={{ marginTop: 6, backgroundColor: '#f8f9fa', padding: '8px 12px', borderRadius: 6 }}>
                <strong>Explanation:</strong> {renderText(d.explanation)}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => navigate(0)}>Try Again</button>
        <button className="btn" onClick={() => navigate('/')}>Back to Home</button>
      </div>
    </div>
  )
}


