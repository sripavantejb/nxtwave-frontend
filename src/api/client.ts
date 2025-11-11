export type Topic = {
  id: string
  name: string
  description: string
  hint?: string
}

export type QuizQuestion = {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

export type Flashcard = {
  id: string
  topicId: string
  topicName: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options: string[]
  answerIndex: number
  answerText: string
  explanation: string
}

const BASE_URL = import.meta.env.VITE_API_URL || 'https://nxtwave-backend-1.onrender.com'

export async function fetchTopics(): Promise<Topic[]> {
  const res = await fetch(`${BASE_URL}/api/topics`)
  if (!res.ok) throw new Error('Failed to load topics')
  return res.json()
}

export async function pingHealth(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/health`, { cache: 'no-store', mode: 'cors' })
  } catch {
    // ignore - warmup only
  }
}
export async function fetchQuiz(topicId: string, rating: number): Promise<{ topicId: string, rating: number, questions: QuizQuestion[] }> {
  const url = new URL(`${BASE_URL}/api/quiz`)
  url.searchParams.set('topicId', topicId)
  url.searchParams.set('rating', String(rating))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to load quiz')
  return res.json()
}

export async function fetchRandomFlashcard(excludeIds: string[] = []): Promise<{ flashcard: Flashcard }> {
  const url = new URL(`${BASE_URL}/api/flashcards/random`)
  if (excludeIds.length > 0) {
    url.searchParams.set('excludeIds', excludeIds.join(','))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to load flashcard')
  return res.json()
}

export async function fetchFollowUpFlashcard(
  topicId: string,
  rating: number,
  excludeIds: string[] = []
): Promise<{ flashcard: Flashcard }> {
  const url = new URL(`${BASE_URL}/api/flashcards/follow-up`)
  url.searchParams.set('topicId', topicId)
  url.searchParams.set('rating', String(rating))
  if (excludeIds.length > 0) {
    url.searchParams.set('excludeIds', excludeIds.join(','))
  }

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to load follow-up flashcard')
  return res.json()
}

export async function fetchSingleQuestion(
  topicId: string,
  rating: number,
  excludeIds: string[] = []
): Promise<{ question: QuizQuestion }> {
  const url = new URL(`${BASE_URL}/api/question`)
  url.searchParams.set('topicId', topicId)
  url.searchParams.set('rating', String(rating))
  if (excludeIds.length > 0) {
    url.searchParams.set('excludeIds', excludeIds.join(','))
  }

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to load question')
  return res.json()
}


