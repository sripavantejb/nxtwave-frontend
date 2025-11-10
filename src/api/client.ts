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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function fetchTopics(): Promise<Topic[]> {
  const res = await fetch(`${BASE_URL}/api/topics`)
  if (!res.ok) throw new Error('Failed to load topics')
  return res.json()
}

export async function fetchQuiz(topicId: string, rating: number): Promise<{ topicId: string, rating: number, questions: QuizQuestion[] }> {
  const url = new URL(`${BASE_URL}/api/quiz`)
  url.searchParams.set('topicId', topicId)
  url.searchParams.set('rating', String(rating))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to load quiz')
  return res.json()
}


