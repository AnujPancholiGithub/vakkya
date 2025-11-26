import { api, ApiError } from './api-client'

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  email: string
  password: string
}

function setAuthToken(token: string): void {
  localStorage.setItem('token', token)
  // Also set cookie for middleware (httpOnly would be better but requires API changes)
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
}

function clearAuthToken(): void {
  localStorage.removeItem('token')
  document.cookie = 'token=; path=/; max-age=0'
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', input)
  setAuthToken(response.token)
  return response
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/signup', input)
  setAuthToken(response.token)
  return response
}

export function logout(): void {
  clearAuthToken()
  window.location.href = '/login'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export { ApiError }
