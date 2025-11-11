import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Flashcard } from '../api/client'
import { fetchFollowUpFlashcard, fetchRandomFlashcard } from '../api/client'

type Phase = 'loading' | 'flashcard' | 'followUp' | 'error'

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

function useTransitionKey(phase: Phase, flashcard: Flashcard | null, followUp: Flashcard | null) {
  return useMemo(() => {
    if (phase === 'flashcard') {
      return flashcard?.id ?? 'flashcard-loading'
    }
    if (phase === 'followUp') {
      return `follow-${followUp?.id ?? 'loading'}`
    }
    if (phase === 'error') {
      return 'flashcard-error'
    }
    return 'flashcard-loading'
  }, [phase, flashcard, followUp])
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

export default function FlashcardSpotlight() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null)
  const [followUp, setFollowUp] = useState<Flashcard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Loading flashcard...')
  const [showFollowUpAnswer, setShowFollowUpAnswer] = useState(false)

  const { ref: recentRef, add: rememberId } = useRecentIds(RECENT_LIMIT)
  const transitionKey = useTransitionKey(phase, flashcard, followUp)

  const loadRandomFlashcard = useCallback(
    async (message = 'Loading flashcard...') => {
      setLoadingMessage(message)
      setPhase('loading')
      setError(null)
      setShowFollowUpAnswer(false)
      setFollowUp(null)

      try {
        const { flashcard: fetched } = await fetchRandomFlashcard(recentRef.current)
        setFlashcard(fetched)
        rememberId(fetched.id)
        setPhase('flashcard')
      } catch (err) {
        console.error(err)
        setError('Could not load a flashcard right now. Please try again.')
        setPhase('error')
      }
    },
    [recentRef, rememberId]
  )

  useEffect(() => {
    loadRandomFlashcard()
  }, [loadRandomFlashcard])

  const handleInitialRating = useCallback(
    async (value: number) => {
      if (!flashcard) return
      setLoadingMessage('Finding the right follow-up...')
      setPhase('loading')
      setError(null)

      try {
        const { flashcard: followUpCard } = await fetchFollowUpFlashcard(
          flashcard.topicId,
          value,
          recentRef.current
        )
        setFollowUp(followUpCard)
        rememberId(followUpCard.id)
        setShowFollowUpAnswer(false)
        setPhase('followUp')
      } catch (err) {
        console.error(err)
        setError('Unable to load a follow-up question. Showing a new flashcard instead.')
        await loadRandomFlashcard('Loading a new flashcard...')
      }
    },
    [flashcard, loadRandomFlashcard, recentRef, rememberId]
  )

  const handleFollowUpRating = useCallback(
    async () => {
      await loadRandomFlashcard('Loading the next flashcard...')
    },
    [loadRandomFlashcard]
  )

  if (!flashcard && phase === 'error') {
    return (
      <div className="card flashcard-card">
        <div className="flashcard-stage" key={transitionKey}>
          <header className="flashcard-header">
            <h3>Concept Spotlight</h3>
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
          <h3>{phase === 'followUp' ? 'Follow-up Practice' : 'Concept Spotlight'}</h3>
          {phase !== 'loading' && (
            <div className="flashcard-meta">
              {(phase === 'flashcard' ? flashcard : followUp)?.topicName && (
                <span className="flashcard-pill">
                  {(phase === 'flashcard' ? flashcard : followUp)?.topicName}
                </span>
              )}
              {(phase === 'flashcard' ? flashcard : followUp)?.difficulty && (
                <span
                  className={`quiz-chip difficulty-${(phase === 'flashcard' ? flashcard : followUp)?.difficulty ?? 'easy'
                    }`}
                >
                  {(phase === 'flashcard' ? flashcard : followUp)?.difficulty.toUpperCase()}
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
            <p className="flashcard-question">{flashcard.question}</p>

            <div className="flashcard-answer">
              <span className="flashcard-answer-label">Answer</span>
              <div className="flashcard-answer-content">{getAnswer(flashcard)}</div>
            </div>

            {flashcard.explanation && (
              <div className="flashcard-explanation">
                <span className="flashcard-answer-label">Why</span>
                <div className="flashcard-answer-content">{flashcard.explanation}</div>
              </div>
            )}

            <div className="flashcard-rate-block">
              <p className="flashcard-rate-label">How confident do you feel about this concept?</p>
              <RatingScale onSelect={handleInitialRating} />
              <p className="flashcard-rate-hint">
                Ratings 1-2 will revisit the basics, while 3-5 unlock deeper practice.
              </p>
            </div>
          </>
        )}

        {phase === 'followUp' && followUp && (
          <>
            <p className="flashcard-question">{followUp.question}</p>

            <button
              type="button"
              className="btn btn-ghost flashcard-toggle"
              onClick={() => setShowFollowUpAnswer(prev => !prev)}
            >
              {showFollowUpAnswer ? 'Hide Answer' : 'Reveal Answer'}
            </button>

            {showFollowUpAnswer && (
              <div className="flashcard-answer flashcard-answer-reveal">
                <span className="flashcard-answer-label">Answer</span>
                <div className="flashcard-answer-content">{getAnswer(followUp)}</div>
                {followUp.explanation && (
                  <div className="flashcard-explanation">
                    <span className="flashcard-answer-label">Why</span>
                    <div className="flashcard-answer-content">{followUp.explanation}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flashcard-rate-block">
              <p className="flashcard-rate-label">Ready for the next concept?</p>
              <RatingScale onSelect={handleFollowUpRating} />
              <p className="flashcard-rate-hint">Your feedback keeps the loop adaptive.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


