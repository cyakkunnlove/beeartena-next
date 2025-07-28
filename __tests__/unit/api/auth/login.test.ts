import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '@/app/api/auth/login/route'
import { authService } from '@/lib/auth/authService'
import { generateToken } from '@/lib/api/jwt'
import * as middleware from '@/lib/api/middleware'
import { User } from '@/lib/types'

// Mock dependencies
jest.mock('@/lib/auth/authService')
jest.mock('@/lib/api/jwt')
jest.mock('@/lib/api/middleware', () => ({
  errorResponse: jest.fn((message, status) => ({
    json: async () => ({ error: message }),
    status,
  })),
  successResponse: jest.fn((data) => ({
    json: async () => ({ success: true, data }),
    status: 200,
  })),
  validateRequestBody: jest.fn(),
  rateLimit: jest.fn(),
  setCorsHeaders: jest.fn((response) => response),
}))

describe('Login API Route', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: '山田太郎',
    phone: '090-1234-5678',
    role: 'customer',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockToken = 'mock.jwt.token'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OPTIONS /api/auth/login', () => {
    it('should return CORS headers for preflight request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'OPTIONS',
      })

      const response = await OPTIONS(mockRequest)

      expect(middleware.setCorsHeaders).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/auth/login', () => {
    const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
    }

    it('should successfully login with valid credentials', async () => {
      const mockBody = { email: 'test@example.com', password: 'password123' }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.login as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      const response = await POST(mockRequest)

      expect(middleware.rateLimit).toHaveBeenCalledWith(mockRequest, 5, 60000)
      expect(middleware.validateRequestBody).toHaveBeenCalledWith(
        mockRequest,
        ['email', 'password']
      )
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(generateToken).toHaveBeenCalledWith(mockUser)
      expect(middleware.successResponse).toHaveBeenCalledWith({
        user: mockUser,
        token: mockToken,
      })
      expect(middleware.setCorsHeaders).toHaveBeenCalled()
    })

    it('should handle rate limiting', async () => {
      const mockRequest = createMockRequest({})
      const rateLimitResponse = { status: 429, message: 'Too many requests' }
      
      ;(middleware.rateLimit as jest.Mock).mockReturnValue(rateLimitResponse)

      const response = await POST(mockRequest)

      expect(response).toEqual(rateLimitResponse)
      expect(middleware.validateRequestBody).not.toHaveBeenCalled()
      expect(authService.login).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const mockRequest = createMockRequest({ email: 'test@example.com' }) // Missing password
      const validationError = { status: 400, message: 'Missing required fields' }

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: null,
        error: validationError,
      })

      const response = await POST(mockRequest)

      expect(response).toEqual(validationError)
      expect(authService.login).not.toHaveBeenCalled()
    })

    it('should handle invalid credentials', async () => {
      const mockBody = { email: 'wrong@example.com', password: 'wrongpassword' }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      )

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('Invalid credentials', 401)
      expect(generateToken).not.toHaveBeenCalled()
    })

    it('should handle generic login errors', async () => {
      const mockBody = { email: 'test@example.com', password: 'password123' }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.login as jest.Mock).mockRejectedValue('Unknown error')

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('ログインに失敗しました', 401)
    })

    it('should handle token generation errors', async () => {
      const mockBody = { email: 'test@example.com', password: 'password123' }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.login as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockRejectedValue(new Error('Token generation failed'))

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('Token generation failed', 401)
    })

    it('should handle different email formats', async () => {
      const emailFormats = [
        'test@example.com',
        'user+tag@example.com',
        'test.user@example.co.jp',
        'user_name@example-domain.com',
      ]

      for (const email of emailFormats) {
        jest.clearAllMocks()
        const mockBody = { email, password: 'password123' }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })
        ;(authService.login as jest.Mock).mockResolvedValue({ ...mockUser, email })
        ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

        await POST(mockRequest)

        expect(authService.login).toHaveBeenCalledWith(email, 'password123')
      }
    })

    it('should handle requests with extra fields', async () => {
      const mockBody = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true, // Extra field
        deviceId: 'device123', // Extra field
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { email: mockBody.email, password: mockBody.password },
        error: null,
      })
      ;(authService.login as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      const response = await POST(mockRequest)

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(middleware.successResponse).toHaveBeenCalled()
    })

    it('should handle concurrent login requests', async () => {
      const mockBody = { email: 'test@example.com', password: 'password123' }
      const requests = Array(3).fill(null).map(() => createMockRequest(mockBody))

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.login as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      const responses = await Promise.all(requests.map(req => POST(req)))

      expect(responses).toHaveLength(3)
      expect(authService.login).toHaveBeenCalledTimes(3)
    })

    it('should handle malformed JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockRejectedValue(
        new Error('Invalid JSON')
      )

      await expect(POST(mockRequest)).rejects.toThrow()
    })

    it('should handle empty request body', async () => {
      const mockRequest = createMockRequest({})
      const validationError = { status: 400, message: 'Missing required fields' }

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: null,
        error: validationError,
      })

      const response = await POST(mockRequest)

      expect(response).toEqual(validationError)
    })

    it('should apply CORS headers to all responses', async () => {
      const testCases = [
        // Success case
        {
          setup: () => {
            ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
            ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
              data: { email: 'test@example.com', password: 'password123' },
              error: null,
            })
            ;(authService.login as jest.Mock).mockResolvedValue(mockUser)
            ;(generateToken as jest.Mock).mockResolvedValue(mockToken)
          },
        },
        // Error case
        {
          setup: () => {
            ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
            ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
              data: { email: 'test@example.com', password: 'password123' },
              error: null,
            })
            ;(authService.login as jest.Mock).mockRejectedValue(new Error('Login failed'))
          },
        },
        // Rate limit case
        {
          setup: () => {
            ;(middleware.rateLimit as jest.Mock).mockReturnValue({ status: 429 })
          },
        },
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        testCase.setup()

        const mockRequest = createMockRequest({ email: 'test@example.com', password: 'password123' })
        await POST(mockRequest)

        expect(middleware.setCorsHeaders).toHaveBeenCalled()
      }
    })
  })

  describe('Security Considerations', () => {
    it('should not expose sensitive information in error messages', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
      })

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { email: 'test@example.com', password: 'password123' },
        error: null,
      })
      ;(authService.login as jest.Mock).mockRejectedValue(
        new Error('User test@example.com not found in database')
      )

      await POST(mockRequest)

      // Should not expose the actual error message containing user email
      expect(middleware.errorResponse).not.toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
        expect.any(Number)
      )
    })

    it('should handle SQL injection attempts in email field', async () => {
      const mockRequest = createMockRequest({
        email: "admin' OR '1'='1",
        password: 'password123',
      })

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { email: "admin' OR '1'='1", password: 'password123' },
        error: null,
      })
      ;(authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

      await POST(mockRequest)

      expect(authService.login).toHaveBeenCalledWith("admin' OR '1'='1", 'password123')
      expect(middleware.errorResponse).toHaveBeenCalled()
    })

    it('should handle XSS attempts in request body', async () => {
      const mockRequest = createMockRequest({
        email: '<script>alert("xss")</script>',
        password: 'password123',
      })

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { email: '<script>alert("xss")</script>', password: 'password123' },
        error: null,
      })
      ;(authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

      await POST(mockRequest)

      expect(authService.login).toHaveBeenCalledWith('<script>alert("xss")</script>', 'password123')
    })
  })
})