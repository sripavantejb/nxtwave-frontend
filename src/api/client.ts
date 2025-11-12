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

// Prefer explicit env, otherwise use the hosted backend
function getBaseUrl(): string {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Always use the hosted backend
  return 'https://nxtwave-backend-p4cf.onrender.com'
}

const BASE_URL = getBaseUrl()

// Log the base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('API Base URL:', BASE_URL)
}

async function request<T>(path: string, params?: URLSearchParams): Promise<T> {
  const controller = new AbortController()
  // Increased timeout for Render backend which may have cold starts (10-30 seconds)
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  try {
    const url = params ? `${BASE_URL}${path}?${params.toString()}` : `${BASE_URL}${path}`
    
    if (import.meta.env.DEV) {
      console.log('Fetching:', url)
    }
    
    const res = await fetch(url, {
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal
    })
    
    if (!res.ok) {
      const maybeJson = await res.json().catch(() => ({}))
      const message = (maybeJson as any).error || (maybeJson as any).message || `Request failed (${res.status})`
      throw new Error(message)
    }
    return res.json() as Promise<T>
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      const errorMsg = `Network timeout. Please check if the backend is running at ${BASE_URL}`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
    if (import.meta.env.DEV) {
      console.error('Request error:', err)
    }
    throw err as Error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchTopics(): Promise<Topic[]> {
  return request<Topic[]>('/api/topics')
}

export async function pingHealth(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/health`, { cache: 'no-store', mode: 'cors' })
  } catch {
    // ignore - warmup only
  }
}
export async function fetchQuiz(topicId: string, rating: number): Promise<{ topicId: string, rating: number, questions: QuizQuestion[] }> {
  const params = new URLSearchParams()
  params.set('topicId', topicId)
  params.set('rating', String(rating))
  return request<{ topicId: string, rating: number, questions: QuizQuestion[] }>('/api/quiz', params)
}

export async function fetchRandomFlashcard(excludeIds: string[] = []): Promise<{ flashcard: Flashcard }> {
  const params = new URLSearchParams()
  if (excludeIds.length > 0) params.set('excludeIds', excludeIds.join(','))
  return request<{ flashcard: Flashcard }>('/api/flashcards/random', params)
}

export async function fetchFollowUpFlashcard(
  topicId: string,
  rating: number,
  excludeIds: string[] = []
): Promise<{ flashcard: Flashcard }> {
  const params = new URLSearchParams()
  params.set('topicId', topicId)
  params.set('rating', String(rating))
  if (excludeIds.length > 0) params.set('excludeIds', excludeIds.join(','))
  return request<{ flashcard: Flashcard }>('/api/flashcards/follow-up', params)
}

export async function fetchSingleQuestion(
  topicId: string,
  rating: number,
  excludeIds: string[] = []
): Promise<{ question: QuizQuestion }> {
  const params = new URLSearchParams()
  params.set('topicId', topicId)
  params.set('rating', String(rating))
  if (excludeIds.length > 0) params.set('excludeIds', excludeIds.join(','))
  return request<{ question: QuizQuestion }>('/api/question', params)
}


