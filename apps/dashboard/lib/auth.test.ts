import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { login, signup, logout, getToken, isAuthenticated } from './auth'

// Mock api-client
vi.mock('./api-client', () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { api } from './api-client'

describe('Auth', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'token=; path=/; max-age=0'
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('login', () => {
    it('should store token on successful login', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', createdAt: '2024-01-01' },
        token: 'test-token',
      }
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await login({ email: 'test@example.com', password: 'password123' })

      expect(result).toEqual(mockResponse)
      expect(localStorage.getItem('token')).toBe('test-token')
      expect(document.cookie).toContain('token=test-token')
    })

    it('should call API with correct endpoint and data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ user: {}, token: 'token' })

      await login({ email: 'test@example.com', password: 'password123' })

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('signup', () => {
    it('should store token on successful signup', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', createdAt: '2024-01-01' },
        token: 'new-token',
      }
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await signup({ email: 'test@example.com', password: 'password123' })

      expect(result).toEqual(mockResponse)
      expect(localStorage.getItem('token')).toBe('new-token')
    })

    it('should call API with correct endpoint', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ user: {}, token: 'token' })

      await signup({ email: 'test@example.com', password: 'password123' })

      expect(api.post).toHaveBeenCalledWith('/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('token', 'stored-token')
      expect(getToken()).toBe('stored-token')
    })

    it('should return null when no token', () => {
      expect(getToken()).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'some-token')
      expect(isAuthenticated()).toBe(true)
    })

    it('should return false when no token', () => {
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear token from localStorage', () => {
      localStorage.setItem('token', 'test-token')
      
      // Mock window.location
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      logout()

      expect(localStorage.getItem('token')).toBeNull()
      
      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      })
    })
  })
})
