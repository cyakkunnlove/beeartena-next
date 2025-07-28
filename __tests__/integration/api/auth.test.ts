import { createMocks } from 'node-mocks-http'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import * as bcrypt from 'bcryptjs'

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

// Mock JWT
jest.mock('@/lib/api/jwt', () => ({
  generateToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  signJWT: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyJWT: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'customer',
      }

      const { db } = require('@/lib/firebase/admin')
      const mockDocs = [{
        id: mockUser.id,
        data: () => mockUser,
      }]
      
      db.collection().where().get.mockResolvedValue({
        empty: false,
        docs: mockDocs,
      })

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await loginHandler(req as any)
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
      const { db } = require('@/lib/firebase/admin')
      db.collection().where().get.mockResolvedValue({
        empty: true,
        docs: [],
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'wrong@example.com',
          password: 'password123',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('should fail with invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
      }

      const { db } = require('@/lib/firebase/admin')
      db.collection().where().get.mockResolvedValue({
        empty: false,
        docs: [{
          id: mockUser.id,
          data: () => mockUser,
        }],
      })

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'test@example.com',
          password: 'wrong-password',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('should validate required fields', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: '',
          password: '',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('メールアドレスとパスワードは必須です')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { db, auth } = require('@/lib/firebase/admin')
      
      // Mock email not exists
      db.collection().where().get.mockResolvedValue({
        empty: true,
        docs: [],
      })

      // Mock Firebase Auth user creation
      auth.createUser.mockResolvedValue({
        uid: 'new-user-id',
      })

      // Mock password hashing
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

      // Mock Firestore document creation
      const mockSet = jest.fn()
      db.collection().doc.mockReturnValue({
        set: mockSet,
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          phone: '090-1234-5678',
        },
      })

      const response = await registerHandler(req as any)
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
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          phone: '090-1234-5678',
          role: 'customer',
          points: 0,
        })
      )
    })

    it('should fail if email already exists', async () => {
      const { db } = require('@/lib/firebase/admin')
      
      db.collection().where().get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-user' }],
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        },
      })

      const response = await registerHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('このメールアドレスは既に登録されています')
    })

    it('should validate required fields', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'test@example.com',
          // Missing password and name
        },
      })

      const response = await registerHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('必須')
    })

    it('should validate email format', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        },
      })

      const response = await registerHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('メールアドレス')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        points: 100,
      }

      const { db } = require('@/lib/firebase/admin')
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject(mockUser)
    })

    it('should fail without authorization header', async () => {
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should fail with invalid token format', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'InvalidFormat',
        },
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should fail when user not found', async () => {
      const { db } = require('@/lib/firebase/admin')
      db.collection().doc().get.mockResolvedValue({
        exists: false,
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('ユーザーが見つかりません')
    })
  })
})