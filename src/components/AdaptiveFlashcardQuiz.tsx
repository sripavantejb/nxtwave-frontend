import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Flashcard, QuizQuestion } from '../api/client'
import { fetchRandomFlashcard, fetchSingleQuestion } from '../api/client'
import { renderText } from './renderText'

type Phase = 'loading' | 'flashcard' | 'question' | 'result' | 'error'

const RATING_VALUES = [1, 2, 3, 4, 5] as const
const RECENT_LIMIT = 12

function getAnswer(card: Flashcard | null) {
  if (!card) return ''
  if (card.answerText) return card.answerText
  const idx = card.answerIndex
  if (typeof idx === 'number' && idx >= 0 && idx < card.options.length) {
    return card.options[idx]
  }
  return ''
}

function useRecentIds(limit: number) {
  const ref = useRef<string[]>([])

  const add = useCallback(
    (id: string | undefined | null) => {
      if (!id) return
      const next = ref.current.filter(existing => existing !== id)
      next.push(id)
      if (next.length > limit) {
        ref.current = next.slice(next.length - limit)
      } else {
        ref.current = next
      }
    },
    [limit]
  )

  return { ref, add }
}

function useTransitionKey(phase: Phase, flashcard: Flashcard | null, question: QuizQuestion | null) {
  return useMemo(() => {
    if (phase === 'flashcard') {
      return flashcard?.id ?? 'flashcard-loading'
    }
    if (phase === 'question' || phase === 'result') {
      return `question-${question?.id ?? 'loading'}`
    }
    if (phase === 'error') {
      return 'flashcard-error'
    }
    return 'flashcard-loading'
  }, [phase, flashcard, question])
}

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

export default function AdaptiveFlashcardQuiz() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null)
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Loading flashcard...')

  const { ref: recentFlashcardIds, add: rememberFlashcardId } = useRecentIds(RECENT_LIMIT)
  const { ref: recentQuestionIds, add: rememberQuestionId } = useRecentIds(RECENT_LIMIT)
  const transitionKey = useTransitionKey(phase, flashcard, question)
  const autoLoadTimeoutRef = useRef<number | null>(null)

  const loadRandomFlashcard = useCallback(
    async (message = 'Loading flashcard...') => {
      // Clear any pending auto-load
      if (autoLoadTimeoutRef.current) {
        clearTimeout(autoLoadTimeoutRef.current)
        autoLoadTimeoutRef.current = null
      }

      setLoadingMessage(message)
      setPhase('loading')
      setError(null)
      setQuestion(null)
      setSelectedOption(null)

      try {
        const { flashcard: fetched } = await fetchRandomFlashcard(recentFlashcardIds.current)
        setFlashcard(fetched)
        rememberFlashcardId(fetched.id)
        setPhase('flashcard')
      } catch (err) {
        console.error(err)
        setError('Could not load a flashcard right now. Please try again.')
        setPhase('error')
      }
    },
    [recentFlashcardIds, rememberFlashcardId]
  )

  useEffect(() => {
    loadRandomFlashcard()
    // Cleanup function to clear timeout on unmount
    return () => {
      if (autoLoadTimeoutRef.current) {
        clearTimeout(autoLoadTimeoutRef.current)
      }
    }
  }, [loadRandomFlashcard])

  const handleFlashcardRating = useCallback(
    async (rating: number) => {
      if (!flashcard) return
      setLoadingMessage('Finding the perfect question for you...')
      setPhase('loading')
      setError(null)

      try {
        const { question: fetchedQuestion } = await fetchSingleQuestion(
          flashcard.topicId,
          rating,
          recentQuestionIds.current
        )
        setQuestion(fetchedQuestion)
        rememberQuestionId(fetchedQuestion.id)
        setSelectedOption(null)
        setPhase('question')
      } catch (err) {
        console.error(err)
        setError('Unable to load a question. Loading a new flashcard instead.')
        await loadRandomFlashcard('Loading a new flashcard...')
      }
    },
    [flashcard, loadRandomFlashcard, recentQuestionIds, rememberQuestionId]
  )

  const handleOptionSelect = useCallback((index: number) => {
    setSelectedOption(index)
  }, [])

  const handleSubmitAnswer = useCallback(() => {
    if (selectedOption === null || !question) return
    setPhase('result')
    
    // Auto-load next flashcard after 5 seconds
    autoLoadTimeoutRef.current = setTimeout(() => {
      loadRandomFlashcard('Loading next flashcard...')
    }, 5000)
  }, [selectedOption, question, loadRandomFlashcard])

  const handleNextFlashcard = useCallback(() => {
    loadRandomFlashcard('Loading next flashcard...')
  }, [loadRandomFlashcard])

  

  const isCorrect = selectedOption !== null && question && selectedOption === question.answerIndex
  const difficultyLabel = useMemo(() => {
    if (phase === 'flashcard' && flashcard) return flashcard.difficulty
    if ((phase === 'question' || phase === 'result') && question) return question.difficulty
    return 'medium'
  }, [phase, flashcard, question])

  if (!flashcard && phase === 'error') {
    return (
      <div className="card flashcard-card">
        <div className="flashcard-stage" key={transitionKey}>
          <header className="flashcard-header">
            <h3>Adaptive Flashcard Preview</h3>
          </header>
          <p className="flashcard-error">{error ?? 'Something went wrong.'}</p>
          <button className="btn btn-primary" type="button" onClick={() => loadRandomFlashcard()}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card flashcard-card">
      <div className="flashcard-stage" key={transitionKey}>
        <header className="flashcard-header">
          <h3>
            {phase === 'flashcard' && 'Concept Spotlight'}
            {phase === 'question' && 'Practice Question'}
            {phase === 'result' && 'Your Result'}
            {phase === 'loading' && 'Loading...'}
          </h3>
          {phase !== 'loading' && phase !== 'error' && (
            <div className="flashcard-meta">
              {phase === 'flashcard' && flashcard?.topicName && (
                <span className="flashcard-pill">{flashcard.topicName}</span>
              )}
              {(phase === 'question' || phase === 'result') && question && flashcard?.topicName && (
                <span className="flashcard-pill">{flashcard.topicName}</span>
              )}
              {difficultyLabel && (
                <span className={`quiz-chip difficulty-${difficultyLabel}`}>
                  {difficultyLabel.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </header>

        {phase === 'loading' && (
          <div className="flashcard-loading">
            <div className="flashcard-spinner" aria-hidden="true" />
            <p>{loadingMessage}</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flashcard-loading">
            <p className="flashcard-error">{error ?? 'Something went wrong.'}</p>
            <button className="btn btn-primary" type="button" onClick={() => loadRandomFlashcard()}>
              Try Again
            </button>
          </div>
        )}

        {phase === 'flashcard' && flashcard && (
          <>
            <p className="flashcard-question">{renderText(flashcard.question)}</p>

            <div className="flashcard-answer">
              <span className="flashcard-answer-label">Answer</span>
              <div className="flashcard-answer-content">{renderText(getAnswer(flashcard))}</div>
            </div>

            {flashcard.explanation && (
              <div className="flashcard-explanation">
                <span className="flashcard-answer-label">Why</span>
                <div className="flashcard-answer-content">{renderText(flashcard.explanation)}</div>
              </div>
            )}

            <div className="flashcard-rate-block">
              <p className="flashcard-rate-label">How confident do you feel about this concept?</p>
              <RatingScale onSelect={handleFlashcardRating} />
              <p className="flashcard-rate-hint">
                Ratings 1-2 will revisit the basics, while 3-5 unlock deeper practice.
              </p>
            </div>
          </>
        )}

        {phase === 'question' && question && (
          <>
            <p className="flashcard-question">{renderText(question.question)}</p>

            <div className="quiz-options" style={{ marginTop: '16px' }}>
              {question.options.map((opt, i) => (
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

            <div className="quiz-actions" style={{ marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
              >
                Submit Answer
              </button>
              <button className="btn btn-ghost" onClick={handleNextFlashcard}>
                Skip Question
              </button>
            </div>
          </>
        )}

        {phase === 'result' && question && selectedOption !== null && (
          <>
            <div
              className="result-badge"
              style={{
                background: isCorrect ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                border: `2px solid ${isCorrect ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`
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
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </h4>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                {isCorrect
                  ? 'Great job! You got the right answer.'
                  : `The correct answer is: ${String.fromCharCode(65 + question.answerIndex)}`}
              </p>
            </div>

            <p className="flashcard-question" style={{ marginBottom: '12px' }}>
              {renderText(question.question)}
            </p>

            <div className="quiz-options">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${selectedOption === i ? 'selected' : ''} ${
                    i === question.answerIndex ? 'option-btn-correct' : ''
                  }`}
                  disabled
                  style={{
                    cursor: 'not-allowed',
                    opacity: i === question.answerIndex || i === selectedOption ? 1 : 0.6,
                    borderColor:
                      i === question.answerIndex
                        ? '#15803d'
                        : i === selectedOption
                        ? '#b91c1c'
                        : 'rgba(153,27,27,0.22)',
                    background:
                      i === question.answerIndex
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
                        i === question.answerIndex
                          ? '#15803d'
                          : i === selectedOption
                          ? '#b91c1c'
                          : 'rgba(153,27,27,0.12)',
                      color: i === question.answerIndex || i === selectedOption ? 'white' : 'var(--accent)'
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="option-text">{renderText(opt)}</span>
                </button>
              ))}
            </div>

            {question.explanation && (
              <div className="flashcard-explanation" style={{ marginTop: '20px' }}>
                <span className="flashcard-answer-label">Explanation</span>
                <div className="flashcard-answer-content">{renderText(question.explanation)}</div>
              </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={handleNextFlashcard}>
                Next Flashcard
              </button>
              <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--muted)' }}>
                Auto-loading next flashcard in a moment...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

