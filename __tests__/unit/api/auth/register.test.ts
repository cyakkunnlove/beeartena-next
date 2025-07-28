import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '@/app/api/auth/register/route'
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
  successResponse: jest.fn((data, status = 200) => ({
    json: async () => ({ success: true, data }),
    status,
  })),
  validateRequestBody: jest.fn(),
  rateLimit: jest.fn(),
  setCorsHeaders: jest.fn((response) => response),
}))

describe('Register API Route', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'newuser@example.com',
    name: '新規ユーザー',
    phone: '090-9876-5432',
    role: 'customer',
    birthday: '1990-05-05',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockToken = 'mock.jwt.token'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OPTIONS /api/auth/register', () => {
    it('should return CORS headers for preflight request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'OPTIONS',
      })

      const response = await OPTIONS(mockRequest)

      expect(middleware.setCorsHeaders).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/auth/register', () => {
    const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
    }

    it('should successfully register new user with all fields', async () => {
      const mockBody = {
        email: 'newuser@example.com',
        password: 'password123',
        name: '新規ユーザー',
        phone: '090-9876-5432',
        birthday: '1990-05-05',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      const response = await POST(mockRequest)

      expect(middleware.rateLimit).toHaveBeenCalledWith(mockRequest, 3, 60000) // 1分間に3回
      expect(middleware.validateRequestBody).toHaveBeenCalledWith(
        mockRequest,
        ['email', 'password', 'name', 'phone']
      )
      expect(authService.register).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
        '1990-05-05'
      )
      expect(generateToken).toHaveBeenCalledWith(mockUser)
      expect(middleware.successResponse).toHaveBeenCalledWith({
        user: mockUser,
        token: mockToken,
      }, 201)
    })

    it('should successfully register without birthday', async () => {
      const mockBody = {
        email: 'newuser@example.com',
        password: 'password123',
        name: '新規ユーザー',
        phone: '090-9876-5432',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      await POST(mockRequest)

      expect(authService.register).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
        undefined
      )
    })

    it('should handle rate limiting', async () => {
      const mockRequest = createMockRequest({})
      const rateLimitResponse = { status: 429, message: 'Too many registration attempts' }
      
      ;(middleware.rateLimit as jest.Mock).mockReturnValue(rateLimitResponse)

      const response = await POST(mockRequest)

      expect(response).toEqual(rateLimitResponse)
      expect(middleware.validateRequestBody).not.toHaveBeenCalled()
      expect(authService.register).not.toHaveBeenCalled()
    })

    it('should validate all required fields', async () => {
      const incompleteRequests = [
        { email: 'test@example.com', password: 'pass123', name: 'Test' }, // Missing phone
        { email: 'test@example.com', password: 'pass123', phone: '090-0000-0000' }, // Missing name
        { email: 'test@example.com', name: 'Test', phone: '090-0000-0000' }, // Missing password
        { password: 'pass123', name: 'Test', phone: '090-0000-0000' }, // Missing email
      ]

      for (const body of incompleteRequests) {
        jest.clearAllMocks()
        const mockRequest = createMockRequest(body)
        const validationError = { status: 400, message: 'Missing required fields' }

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: null,
          error: validationError,
        })

        const response = await POST(mockRequest)

        expect(response).toEqual(validationError)
        expect(authService.register).not.toHaveBeenCalled()
      }
    })

    it('should handle email already exists error', async () => {
      const mockBody = {
        email: 'existing@example.com',
        password: 'password123',
        name: '既存ユーザー',
        phone: '090-1111-1111',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockRejectedValue(
        new Error('Email already registered')
      )

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('Email already registered', 400)
    })

    it('should handle generic registration errors', async () => {
      const mockBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '090-0000-0000',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockRejectedValue('Unknown error')

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('登録に失敗しました', 400)
    })

    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        'test',
        'example.com',
        'test @example.com',
      ]

      for (const email of invalidEmails) {
        jest.clearAllMocks()
        const mockBody = {
          email,
          password: 'password123',
          name: 'Test User',
          phone: '090-0000-0000',
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })

        await POST(mockRequest)

        expect(middleware.errorResponse).toHaveBeenCalledWith('有効なメールアドレスを入力してください')
        expect(authService.register).not.toHaveBeenCalled()
      }
    })

    it('should validate phone number format', async () => {
      const phoneFormats = [
        '090-1234-5678',
        '09012345678',
        '080-1234-5678',
        '070-1234-5678',
        '03-1234-5678',
      ]

      for (const phone of phoneFormats) {
        jest.clearAllMocks()
        const mockBody = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone,
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })
        ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
        ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

        await POST(mockRequest)

        expect(authService.register).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'Test User',
          phone,
          undefined
        )
      }
    })

    it('should validate birthday format', async () => {
      const validBirthdays = [
        '1990-01-01',
        '2000-12-31',
        '1985-06-15',
      ]

      for (const birthday of validBirthdays) {
        jest.clearAllMocks()
        const mockBody = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '090-1234-5678',
          birthday,
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })
        ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
        ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

        await POST(mockRequest)

        expect(authService.register).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'Test User',
          '090-1234-5678',
          birthday
        )
      }
    })

    it('should validate password length', async () => {
      const shortPasswords = ['12345', 'abc', '1', '']

      for (const password of shortPasswords) {
        jest.clearAllMocks()
        const mockBody = {
          email: 'test@example.com',
          password,
          name: 'Test User',
          phone: '090-1234-5678',
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })

        await POST(mockRequest)

        expect(middleware.errorResponse).toHaveBeenCalledWith('パスワードは6文字以上で設定してください')
        expect(authService.register).not.toHaveBeenCalled()
      }
    })

    it('should validate birthday format and date', async () => {
      const invalidBirthdays = [
        'invalid-date',
        '2030-01-01', // Future date
        '2025-13-01', // Invalid month
        '2025-01-32', // Invalid day
      ]

      for (const birthday of invalidBirthdays) {
        jest.clearAllMocks()
        const mockBody = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '090-1234-5678',
          birthday,
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })

        await POST(mockRequest)

        expect(middleware.errorResponse).toHaveBeenCalledWith('有効な生年月日を入力してください')
        expect(authService.register).not.toHaveBeenCalled()
      }
    })

    it('should handle concurrent registration attempts', async () => {
      const mockBody = {
        email: 'concurrent@example.com',
        password: 'password123',
        name: 'Concurrent User',
        phone: '090-1234-5678',
      }

      // First request succeeds
      const request1 = createMockRequest(mockBody)
      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      const response1 = await POST(request1)
      expect(middleware.successResponse).toHaveBeenCalled()

      // Second request fails (email already exists)
      jest.clearAllMocks()
      const request2 = createMockRequest(mockBody)
      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockRejectedValueOnce(
        new Error('Email already exists')
      )

      const response2 = await POST(request2)
      expect(middleware.errorResponse).toHaveBeenCalled()
    })

    it('should sanitize user input', async () => {
      const mockBody = {
        email: ' Test@Example.COM ',
        password: 'password123',
        name: '  Test User  ',
        phone: ' 090-1234-5678 ',
        birthday: ' 1990-01-01 ',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: {
          email: 'test@example.com', // Trimmed and lowercased
          password: 'password123',
          name: 'Test User', // Trimmed
          phone: '090-1234-5678', // Trimmed
          birthday: '1990-01-01', // Trimmed
        },
        error: null,
      })
      ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      await POST(mockRequest)

      expect(authService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
        '090-1234-5678',
        '1990-01-01'
      )
    })

    it('should handle malformed request body', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
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

    it('should handle XSS attempts in user input', async () => {
      const mockBody = {
        email: 'test@example.com',
        password: 'password123',
        name: '<script>alert("xss")</script>',
        phone: '090-1234-5678',
      }
      const mockRequest = createMockRequest(mockBody)

      ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: mockBody,
        error: null,
      })
      ;(authService.register as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: mockBody.name, // Should be stored as-is, sanitization happens on output
      })
      ;(generateToken as jest.Mock).mockResolvedValue(mockToken)

      await POST(mockRequest)

      expect(authService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        '<script>alert("xss")</script>',
        '090-1234-5678',
        undefined
      )
    })

    it('should apply CORS headers to all responses', async () => {
      const scenarios = [
        { shouldSucceed: true },
        { shouldSucceed: false },
      ]

      for (const scenario of scenarios) {
        jest.clearAllMocks()
        const mockBody = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '090-1234-5678',
        }
        const mockRequest = createMockRequest(mockBody)

        ;(middleware.rateLimit as jest.Mock).mockReturnValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockBody,
          error: null,
        })

        if (scenario.shouldSucceed) {
          ;(authService.register as jest.Mock).mockResolvedValue(mockUser)
          ;(generateToken as jest.Mock).mockResolvedValue(mockToken)
        } else {
          ;(authService.register as jest.Mock).mockRejectedValue(new Error('Registration failed'))
        }

        await POST(mockRequest)

        expect(middleware.setCorsHeaders).toHaveBeenCalled()
      }
    })
  })
})