import { createMocks } from 'node-mocks-http'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import { POST as logoutHandler } from '@/app/api/auth/logout/route'
import { signJWT, verifyJWT } from '@/lib/api/jwt'
import * as bcrypt from 'bcryptjs'

jest.mock('@/lib/firebase/config', () => ({
  auth: {},
  db: {},
}))

jest.mock('@/lib/firebase/users', () => ({
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
}))

jest.mock('bcryptjs')

describe('Auth API Integration Tests', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    role: 'user',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const { getUserByEmail } = require('@/lib/firebase/users')
      getUserByEmail.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('token')
      expect(data).toHaveProperty('user')
      expect(data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      })
      expect(data.user).not.toHaveProperty('password')
    })

    it('should fail with invalid email', async () => {
      const { getUserByEmail } = require('@/lib/firebase/users')
      getUserByEmail.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'wrong@example.com',
          password: 'password123',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should fail with invalid password', async () => {
      const { getUserByEmail } = require('@/lib/firebase/users')
      getUserByEmail.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should validate required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: '',
          password: '',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const token = await signJWT({ userId: mockUser.id })
      const { getUserById } = require('@/lib/firebase/users')
      getUserById.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      })
      expect(data).not.toHaveProperty('password')
    })

    it('should fail without token', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should fail with invalid token', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      const response = await meHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      const response = await logoutHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Logged out successfully')
      
      // Check if token cookie is cleared
      const headers = response.headers
      const setCookie = headers.get('set-cookie')
      expect(setCookie).toContain('token=; Max-Age=0')
    })
  })
})