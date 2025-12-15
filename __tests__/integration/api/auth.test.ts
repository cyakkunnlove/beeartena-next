import { NextRequest } from 'next/server'

import { POST as loginHandler } from '@/app/api/auth/login/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { authService } from '@/lib/auth/authService'
import { userService } from '@/lib/firebase/users'

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  auth: {
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

// Mock authService
jest.mock('@/lib/auth/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}))

// Mock userService
jest.mock('@/lib/firebase/users', () => ({
  userService: {
    getUser: jest.fn(),
  },
}))

// Mock JWT
jest.mock('@/lib/api/jwt', () => ({
  generateToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  signJWT: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyJWT: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

// Mock middleware
jest.mock('@/lib/api/middleware', () => ({
  ...jest.requireActual('@/lib/api/middleware'),
  rateLimit: jest.fn().mockReturnValue(null),
  verifyAuth: jest.fn().mockImplementation((req) => {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return { userId: 'test-user-id', role: 'customer' }
  }),
}))

const mockedAuthService = authService as jest.Mocked<typeof authService>
const mockedUserService = userService as jest.Mocked<typeof userService>

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const now = new Date('2025-07-01T10:00:00.000Z')
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '090-0000-0000',
        role: 'customer' as const,
        createdAt: now,
        updatedAt: now,
      }

      mockedAuthService.login.mockResolvedValue(mockUser)

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await loginHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('token', 'mock-jwt-token')
      expect(data).toHaveProperty('user')
      expect(data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      })
      expect(data.user).not.toHaveProperty('password')
    })

    it('should fail with invalid email', async () => {
      mockedAuthService.login.mockRejectedValue(
        new Error('メールアドレスまたはパスワードが正しくありません'),
      )

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'password123',
        }),
      })

      const response = await loginHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('should fail with invalid password', async () => {
      mockedAuthService.login.mockRejectedValue(
        new Error('メールアドレスまたはパスワードが正しくありません'),
      )

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      })

      const response = await loginHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('should validate required fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await loginHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('必須')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const now = new Date('2025-07-01T10:00:00.000Z')
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer' as const,
        phone: '090-1234-5678',
        createdAt: now,
        updatedAt: now,
      }

      mockedAuthService.register.mockResolvedValue(mockUser)

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          phone: '090-1234-5678',
        }),
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('token', 'mock-jwt-token')
      expect(data).toHaveProperty('user')
      expect(data.user).toMatchObject({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer',
      })
    })

    it('should fail if email already exists', async () => {
      mockedAuthService.register.mockRejectedValue(new Error('このメールアドレスは既に登録されています'))

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '090-1234-5678',
        }),
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('このメールアドレスは既に登録されています')
    })

    it('should validate required fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password and name
        }),
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('必須')
    })

    it('should validate email format', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
          phone: '090-1234-5678',
        }),
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('メールアドレス')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const now = new Date('2025-07-01T10:00:00.000Z')
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '090-0000-0000',
        role: 'customer' as const,
        points: 100,
        createdAt: now,
        updatedAt: now,
      }

      mockedUserService.getUser.mockResolvedValue(mockUser)

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await meHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject(mockUser)
    })

    it('should fail without authorization header', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      })

      const response = await meHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should fail with invalid token format', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          authorization: 'InvalidFormat',
        },
      })

      const response = await meHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should fail when user not found', async () => {
      mockedUserService.getUser.mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await meHandler(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('ユーザーが見つかりません')
    })
  })
})
