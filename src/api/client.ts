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
  subTopic?: string
  flashcard?: string
  flashcardAnswer?: string
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
  subTopic?: string
  flashcard?: string
  flashcardAnswer?: string
}

// Prefer explicit env, otherwise use the hosted backend
function getBaseUrl(): string {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In development, default to hosted backend server
  if (import.meta.env.DEV) {
    return 'https://nxtwave-backend-p4cf.onrender.com'
  }
  
  // In production, use the hosted backend server
  return 'https://nxtwave-backend-p4cf.onrender.com'
}

const BASE_URL = getBaseUrl()

// Log the base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('API Base URL:', BASE_URL)
}

async function request<T>(
  path: string, 
  params?: URLSearchParams, 
  options?: { method?: string; body?: string; token?: string }
): Promise<T> {
  const controller = new AbortController()
  // Increased timeout for Render backend which may have cold starts (10-30 seconds)
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  try {
    const url = params ? `${BASE_URL}${path}?${params.toString()}` : `${BASE_URL}${path}`
    
    if (import.meta.env.DEV) {
      console.log('Fetching:', url)
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    // Add JWT token if provided
    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`
    }
    
    const res = await fetch(url, {
      method: options?.method || 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
      headers,
      body: options?.body
    })
    
    // Handle 204 No Content
    if (res.status === 204) {
      return null as T
    }
    
    if (!res.ok) {
      const maybeJson = await res.json().catch(() => ({}))
      const message = (maybeJson as any).error || (maybeJson as any).message || `Request failed (${res.status})`
      const error = new Error(message) as Error & { requiresSession?: boolean; status?: number }
      error.requiresSession = (maybeJson as any).requiresSession || false
      error.status = res.status
      throw error
    }
    return res.json() as Promise<T>
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      const errorMsg = `Network timeout. Please check if the backend is running at ${BASE_URL}`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
    // Suppress error logging for 404/CORS on reset-shown, follow-up questions, and batch endpoints (expected if not deployed or CORS issues)
    const error = err as Error & { status?: number }
    const errorMessage = error?.message?.toLowerCase() || ''
    const isBatchEndpoint = path.includes('/check-new-batch') || path.includes('/create-new-batch')
    const isExpected404 = (path.includes('/reset-shown') || path.includes('/question/followup')) && 
                          (error?.status === 404 || errorMessage.includes('not found') || 
                           errorMessage.includes('no follow-up questions available'))
    const isCorsOrNetworkError = errorMessage.includes('failed to fetch') || 
                                 errorMessage.includes('cors') ||
                                 errorMessage.includes('networkerror') ||
                                 (error?.name === 'TypeError' && errorMessage.includes('fetch'))
    const isBatchError = isBatchEndpoint && (error?.status === 404 || isCorsOrNetworkError)
    
    if (import.meta.env.DEV && !isExpected404 && !isBatchError) {
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
  excludeIds: string[] = [],
  subTopic?: string,
  flashcardQuestionId?: string
): Promise<{ question: QuizQuestion }> {
  const params = new URLSearchParams()
  params.set('topicId', topicId)
  params.set('rating', String(rating))
  if (excludeIds.length > 0) params.set('excludeIds', excludeIds.join(','))
  if (subTopic) params.set('subTopic', subTopic)
  if (flashcardQuestionId) params.set('flashcardQuestionId', flashcardQuestionId)
  return request<{ question: QuizQuestion }>('/api/question', params)
}

// ============== Flashcard API Functions ==============

export type FlashcardData = {
  questionId: string
  flashcard: string
  flashcardAnswer: string
  topic: string
  subTopic: string
  topicId: string
  isDueReview?: boolean
  hint?: string
}

export type FollowUpQuestion = {
  questionId: string
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  key: string
  explanation: string
  difficulty: string
  topic: string
}

export type SubmitResult = {
  correct: boolean
  correctAnswer: string
  explanation: string
}

export type DueReview = {
  questionId: string
  question: string
  topicId: string
  difficulty: string
  timesReviewed: number
  lastAnswerCorrect: boolean | null
  nextReviewDate: string
}

/**
 * Fetch random flashcard (works for authenticated and non-authenticated users)
 * Returns either FlashcardData or an object with allCompleted flag
 */
export async function fetchRandomFlashcardJson(token?: string): Promise<FlashcardData | { allCompleted: true; message: string; sessionSubtopics: string[] }> {
  return request<FlashcardData | { allCompleted: true; message: string; sessionSubtopics: string[] }>('/api/flashcards/random-json', undefined, { token })
}

/**
 * Submit flashcard rating (requires JWT)
 */
export async function submitFlashcardRating(
  questionId: string, 
  rating: number, 
  token: string
): Promise<{ difficulty: string }> {
  return request<{ difficulty: string }>(
    '/api/flashcards/submit-rating',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ questionId, rating }),
      token
    }
  )
}

/**
 * Fetch follow-up question based on topic, difficulty, and subtopic
 */
export async function fetchFollowUpQuestion(
  topic: string,
  difficulty: string,
  subTopic?: string,
  token?: string,
  flashcardQuestionId?: string
): Promise<FollowUpQuestion> {
  const params = new URLSearchParams()
  if (subTopic) params.set('subTopic', subTopic)
  if (flashcardQuestionId) params.set('flashcardQuestionId', flashcardQuestionId)
  return request<FollowUpQuestion>(
    `/api/flashcards/question/followup/${topic}/${difficulty}`,
    params,
    { token }
  )
}

/**
 * Submit answer to follow-up question (requires JWT)
 */
export async function submitFlashcardAnswer(
  questionId: string,
  selectedOption: string,
  token: string,
  flashcardQuestionId?: string,
  flashcardSubTopic?: string
): Promise<SubmitResult> {
  return request<SubmitResult>(
    '/api/flashcards/question/submit',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ 
        questionId, 
        selectedOption,
        ...(flashcardQuestionId && { flashcardQuestionId }),
        ...(flashcardSubTopic && { flashcardSubTopic })
      }),
      token
    }
  )
}

/**
 * Get next question for user (prioritizes due reviews) - requires JWT
 */
export async function getNextQuestion(token: string): Promise<FlashcardData | FollowUpQuestion | null> {
  return request<FlashcardData | FollowUpQuestion | null>(
    '/api/flashcards/next-question',
    undefined,
    { token }
  )
}

/**
 * Get all due reviews for user - requires JWT
 */
export async function getDueReviews(token: string): Promise<{ dueQuestions: DueReview[], count: number }> {
  return request<{ dueQuestions: DueReview[], count: number }>(
    '/api/flashcards/due-reviews',
    undefined,
    { token }
  )
}

/**
 * Get all concepts/flashcards from CSV file
 * Used for conceptual learning flow
 */
export type Concept = {
  id: string
  question: string
  answer: string
  explanation: string
  topicId: string
  subTopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  topicName: string
}

export async function fetchConcepts(): Promise<{ concepts: Concept[] }> {
  return request<{ concepts: Concept[] }>('/api/flashcards/concepts')
}

/**
 * Start a new flashcard session with 6 random subtopics
 * Requires JWT authentication
 */
export type SessionResponse = {
  sessionSubtopics: string[]
  isNewSession: boolean
}

export async function startFlashcardSession(token: string, forceNew: boolean = false): Promise<SessionResponse> {
  const params = new URLSearchParams()
  if (forceNew) {
    params.set('force', 'true')
  }
  return request<SessionResponse>(
    '/api/flashcards/start-session',
    params,
    { token }
  )
}

/**
 * Get current session subtopics
 * Requires JWT authentication
 */
export async function getSessionSubtopics(token: string): Promise<string[]> {
  const response = await startFlashcardSession(token)
  return response.sessionSubtopics
}

/**
 * Reset shown flashcards for current session
 * Requires JWT authentication
 * Returns null if endpoint doesn't exist (404) - handles gracefully
 */
export async function resetShownFlashcards(token: string): Promise<{ success: boolean, message: string } | null> {
  try {
    return await request<{ success: boolean, message: string }>(
      '/api/flashcards/reset-shown',
      undefined,
      { 
        token,
        method: 'POST'
      }
    )
  } catch (err) {
    // If endpoint doesn't exist (404), return null instead of throwing
    // This allows the app to continue functioning even if the endpoint isn't deployed
    const error = err as Error & { status?: number }
    const errorMessage = error?.message?.toLowerCase() || ''
    const is404 = error?.status === 404 || 
                  errorMessage.includes('not found') || 
                  errorMessage.includes('404')
    
    if (is404) {
      // Silently handle 404 - don't log as error since it's expected if endpoint doesn't exist
      return null
    }
    // Re-throw other errors
    throw err
  }
}

// ============== Authentication API Functions ==============

export type User = {
  userId: string
  name: string
  email: string
}

export type AuthResponse = {
  token: string
  user: User
}

export type ProfileResponse = {
  userId: string
  name: string
  email: string
  createdAt: string
}

/**
 * Register a new user
 */
export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/api/auth/register',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }
  )
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/api/auth/login',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }
  )
}

/**
 * Get current user profile (requires JWT)
 */
export async function getProfile(token: string): Promise<ProfileResponse> {
  return request<ProfileResponse>(
    '/api/auth/me',
    undefined,
    { token }
  )
}

/**
 * Logout helper - clears auth token from localStorage
 */
export function logout(): void {
  localStorage.removeItem('authToken')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

/**
 * Check if new batch is available after day shift completion
 * Requires JWT authentication
 * Returns { available: false } on any error (CORS, 404, network failure) to fail gracefully
 */
export async function checkNewBatch(token: string): Promise<{ available: boolean, message?: string }> {
  try {
    return await request<{ available: boolean, message?: string }>(
      '/api/flashcards/check-new-batch',
      undefined,
      { token }
    )
  } catch (err) {
    // Handle CORS/network/404 errors gracefully - endpoint may not be deployed yet
    // Return safe default so UI continues working
    return { available: false }
  }
}

/**
 * Store batch completion time when a batch of 6 flashcards is completed
 * Requires JWT authentication
 * @param token - JWT authentication token
 * @param timestamp - Timestamp in milliseconds since epoch
 * @returns Promise with success status
 */
export async function completeBatch(token: string, timestamp: number): Promise<{ success: boolean, message?: string }> {
  try {
    return await request<{ success: boolean, message?: string }>(
      '/api/flashcards/complete-batch',
      undefined,
      {
        method: 'POST',
        body: JSON.stringify({ timestamp }),
        token
      }
    )
  } catch (err) {
    // Handle CORS/network/404 errors gracefully - endpoint may not be deployed yet
    const error = err as Error & { status?: number }
    const errorMessage = error?.message?.toLowerCase() || ''
    const isCorsOrNetworkError = errorMessage.includes('failed to fetch') || 
                                 errorMessage.includes('cors') ||
                                 errorMessage.includes('networkerror') ||
                                 (error?.name === 'TypeError' && errorMessage.includes('fetch'))
    
    if (error?.status === 404 || isCorsOrNetworkError) {
      // Endpoint may not be deployed yet - return safe default
      console.warn('Batch completion endpoint not available:', err)
      return { success: false }
    }
    
    // Re-throw other errors
    throw err
  }
}

/**
 * Create a new batch after day shift completion
 * Requires JWT authentication
 * Handles CORS/network errors gracefully - throws user-friendly error if endpoint unavailable
 */
export async function createNewBatch(token: string): Promise<SessionResponse & { message?: string }> {
  try {
    return await request<SessionResponse & { message?: string }>(
      '/api/flashcards/create-new-batch',
      undefined,
      {
        method: 'POST',
        token
      }
    )
  } catch (err) {
    // Handle CORS/network/404 errors gracefully
    const error = err as Error & { status?: number }
    const errorMessage = error?.message?.toLowerCase() || ''
    const isCorsOrNetworkError = errorMessage.includes('failed to fetch') || 
                                 errorMessage.includes('cors') ||
                                 errorMessage.includes('networkerror') ||
                                 (error?.name === 'TypeError' && errorMessage.includes('fetch'))
    
    if (error?.status === 404 || isCorsOrNetworkError) {
      // Endpoint may not be deployed yet - throw user-friendly error
      throw new Error('Batch creation endpoint is not available. Please try again later.')
    }
    // Re-throw other errors as-is
    throw err
  }
}


