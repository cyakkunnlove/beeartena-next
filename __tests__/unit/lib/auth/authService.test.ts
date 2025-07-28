import { authService } from '@/lib/auth/authService'
import { firebaseAuth } from '@/lib/firebase/auth'
import { userService } from '@/lib/firebase/users'
import { User } from '@/lib/types'

// Mock dependencies
jest.mock('@/lib/firebase/auth')
jest.mock('@/lib/firebase/users')

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthService', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: '山田太郎',
    phone: '090-1234-5678',
    role: 'customer',
    points: 100,
    birthday: '1990-01-01',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()

    // Reset the auth service state
    ;(authService as any).currentUser = null
  })

  describe('Constructor and Initialization', () => {
    it('should set up auth state listener on construction', () => {
      // Create a new instance to test constructor
      const AuthServiceClass = (authService as any).constructor
      const mockOnAuthStateChange = jest.fn()
      ;(firebaseAuth.onAuthStateChange as jest.Mock) = mockOnAuthStateChange

      new AuthServiceClass()

      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    it('should save session when user is authenticated', () => {
      const mockCallback = (firebaseAuth.onAuthStateChange as jest.Mock).mock.calls[0]?.[0]

      if (mockCallback) {
        const mockDate = new Date('2025-07-01T10:00:00')
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

        mockCallback(mockUser)

        const savedSession = JSON.parse(localStorageMock.getItem('beeartena_session') || '{}')
        expect(savedSession.userId).toBe('user123')
        expect(savedSession.createdAt).toBe('2025-07-01T10:00:00.000Z')
        expect((authService as any).currentUser).toEqual(mockUser)
      }
    })

    it('should clear session when user logs out', () => {
      localStorageMock.setItem('beeartena_session', JSON.stringify({ userId: 'user123' }))

      const mockCallback = (firebaseAuth.onAuthStateChange as jest.Mock).mock.calls[0]?.[0]
      if (mockCallback) {
        mockCallback(null)

        expect(localStorageMock.getItem('beeartena_session')).toBeNull()
        expect((authService as any).currentUser).toBeNull()
      }
    })

    it('should handle window undefined (SSR)', () => {
      const originalWindow = global.window
      delete (global as any).window

      const AuthServiceClass = (authService as any).constructor
      expect(() => new AuthServiceClass()).not.toThrow()

      global.window = originalWindow
    })
  })

  describe('login', () => {
    it('should successfully login user', async () => {
      ;(firebaseAuth.login as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.login('test@example.com', 'password123')

      expect(firebaseAuth.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(result).toEqual(mockUser)
      expect((authService as any).currentUser).toEqual(mockUser)
    })

    it('should handle invalid credentials error', async () => {
      ;(firebaseAuth.login as jest.Mock).mockRejectedValue(new Error('auth/user-not-found'))

      await expect(authService.login('wrong@example.com', 'password123')).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      )
    })

    it('should handle wrong password error', async () => {
      ;(firebaseAuth.login as jest.Mock).mockRejectedValue(new Error('auth/wrong-password'))

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      )
    })

    it('should propagate other login errors', async () => {
      ;(firebaseAuth.login as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'Network error',
      )
    })

    it('should handle empty credentials', async () => {
      ;(firebaseAuth.login as jest.Mock).mockRejectedValue(new Error('auth/invalid-email'))

      await expect(authService.login('', '')).rejects.toThrow('auth/invalid-email')
    })
  })

  describe('register', () => {
    it('should successfully register new user', async () => {
      ;(firebaseAuth.register as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.register(
        'new@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
        '1995-05-05',
      )

      expect(firebaseAuth.register).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
        '1995-05-05',
      )
      expect(result).toEqual(mockUser)
      expect((authService as any).currentUser).toEqual(mockUser)
    })

    it('should register without birthday', async () => {
      ;(firebaseAuth.register as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.register(
        'new@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
      )

      expect(firebaseAuth.register).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
        '新規ユーザー',
        '090-9876-5432',
        undefined,
      )
      expect(result).toEqual(mockUser)
    })

    it('should handle email already in use error', async () => {
      ;(firebaseAuth.register as jest.Mock).mockRejectedValue(
        new Error('auth/email-already-in-use'),
      )

      await expect(
        authService.register('existing@example.com', 'password123', 'Test', '090-0000-0000'),
      ).rejects.toThrow('このメールアドレスは既に登録されています')
    })

    it('should handle weak password error', async () => {
      ;(firebaseAuth.register as jest.Mock).mockRejectedValue(new Error('auth/weak-password'))

      await expect(
        authService.register('new@example.com', '123', 'Test', '090-0000-0000'),
      ).rejects.toThrow('パスワードは6文字以上で設定してください')
    })

    it('should propagate other registration errors', async () => {
      ;(firebaseAuth.register as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        authService.register('new@example.com', 'password123', 'Test', '090-0000-0000'),
      ).rejects.toThrow('Network error')
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      ;(authService as any).currentUser = mockUser
      localStorageMock.setItem('beeartena_session', JSON.stringify({ userId: 'user123' }))
      ;(firebaseAuth.logout as jest.Mock).mockResolvedValue(undefined)

      await authService.logout()

      expect(firebaseAuth.logout).toHaveBeenCalled()
      expect((authService as any).currentUser).toBeNull()
      expect(localStorageMock.getItem('beeartena_session')).toBeNull()
    })

    it('should handle logout errors', async () => {
      ;(firebaseAuth.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'))

      await expect(authService.logout()).rejects.toThrow('Logout failed')
    })

    it('should clear session even if not logged in', async () => {
      localStorageMock.setItem('beeartena_session', JSON.stringify({ userId: 'user123' }))
      ;(firebaseAuth.logout as jest.Mock).mockResolvedValue(undefined)

      await authService.logout()

      expect(localStorageMock.getItem('beeartena_session')).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    it('should return cached user if available', async () => {
      ;(authService as any).currentUser = mockUser

      const result = await authService.getCurrentUser()

      expect(result).toEqual(mockUser)
      expect(firebaseAuth.getCurrentUser).not.toHaveBeenCalled()
    })

    it('should fetch user from Firebase if not cached', async () => {
      ;(authService as any).currentUser = null
      ;(firebaseAuth.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.getCurrentUser()

      expect(firebaseAuth.getCurrentUser).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
      expect((authService as any).currentUser).toEqual(mockUser)
    })

    it('should return null if no user is authenticated', async () => {
      ;(authService as any).currentUser = null
      ;(firebaseAuth.getCurrentUser as jest.Mock).mockResolvedValue(null)

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
    })

    it('should handle errors when fetching current user', async () => {
      ;(authService as any).currentUser = null
      ;(firebaseAuth.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Auth error'))

      await expect(authService.getCurrentUser()).rejects.toThrow('Auth error')
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = { name: '新しい名前', phone: '090-9999-9999' }
      const updatedUser = { ...mockUser, ...updates }

      ;(userService.updateUser as jest.Mock).mockResolvedValue(undefined)
      ;(userService.getUser as jest.Mock).mockResolvedValue(updatedUser)

      const result = await authService.updateProfile('user123', updates)

      expect(userService.updateUser).toHaveBeenCalledWith('user123', updates)
      expect(userService.getUser).toHaveBeenCalledWith('user123')
      expect(result).toEqual(updatedUser)
      expect((authService as any).currentUser).toEqual(updatedUser)
    })

    it('should prevent role updates', async () => {
      const updates = { name: '新しい名前', role: 'admin' as const }
      const safeUpdates = { name: '新しい名前' }
      const updatedUser = { ...mockUser, name: '新しい名前' }

      ;(userService.updateUser as jest.Mock).mockResolvedValue(undefined)
      ;(userService.getUser as jest.Mock).mockResolvedValue(updatedUser)

      await authService.updateProfile('user123', updates)

      expect(userService.updateUser).toHaveBeenCalledWith('user123', safeUpdates)
      expect(userService.updateUser).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ role: 'admin' }),
      )
    })

    it('should handle user not found error', async () => {
      ;(userService.updateUser as jest.Mock).mockResolvedValue(undefined)
      ;(userService.getUser as jest.Mock).mockResolvedValue(null)

      await expect(authService.updateProfile('nonexistent', { name: 'Test' })).rejects.toThrow(
        'ユーザーが見つかりません',
      )
    })

    it('should handle update errors', async () => {
      ;(userService.updateUser as jest.Mock).mockRejectedValue(new Error('Update failed'))

      await expect(authService.updateProfile('user123', { name: 'Test' })).rejects.toThrow(
        'Update failed',
      )
    })

    it('should handle empty updates', async () => {
      const updatedUser = { ...mockUser }
      ;(userService.updateUser as jest.Mock).mockResolvedValue(undefined)
      ;(userService.getUser as jest.Mock).mockResolvedValue(updatedUser)

      const result = await authService.updateProfile('user123', {})

      expect(userService.updateUser).toHaveBeenCalledWith('user123', {})
      expect(result).toEqual(updatedUser)
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when user is logged in', () => {
      ;(authService as any).currentUser = mockUser

      expect(authService.isAuthenticated()).toBe(true)
    })

    it('should return false when user is not logged in', () => {
      ;(authService as any).currentUser = null

      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should return false for undefined user', () => {
      ;(authService as any).currentUser = undefined

      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('checkAdminRole', () => {
    it('should return true for admin users', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const }
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(adminUser)

      const result = await authService.checkAdminRole()

      expect(result).toBe(true)
    })

    it('should return false for customer users', async () => {
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser)

      const result = await authService.checkAdminRole()

      expect(result).toBe(false)
    })

    it('should return false when no user is authenticated', async () => {
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(null)

      const result = await authService.checkAdminRole()

      expect(result).toBe(false)
    })

    it('should handle errors when checking admin role', async () => {
      jest.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('Auth error'))

      await expect(authService.checkAdminRole()).rejects.toThrow('Auth error')
    })
  })

  describe('Session Management', () => {
    it('should maintain session across service instances', () => {
      const session = {
        userId: 'user123',
        createdAt: new Date().toISOString(),
      }
      localStorageMock.setItem('beeartena_session', JSON.stringify(session))

      // Simulate page reload by creating new instance
      const AuthServiceClass = (authService as any).constructor
      const newService = new AuthServiceClass()

      // Session should still exist
      const savedSession = JSON.parse(localStorageMock.getItem('beeartena_session') || '{}')
      expect(savedSession.userId).toBe('user123')
    })

    it('should handle corrupted session data', () => {
      localStorageMock.setItem('beeartena_session', 'invalid json')

      // Should not throw when accessing session
      expect(() => {
        const AuthServiceClass = (authService as any).constructor
        new AuthServiceClass()
      }).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      ;(firebaseAuth.login as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 100)),
      )

      const promise1 = authService.login('test@example.com', 'password123')
      const promise2 = authService.login('test@example.com', 'password123')

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toEqual(mockUser)
      expect(result2).toEqual(mockUser)
      expect(firebaseAuth.login).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid logout/login sequences', async () => {
      ;(firebaseAuth.login as jest.Mock).mockResolvedValue(mockUser)
      ;(firebaseAuth.logout as jest.Mock).mockResolvedValue(undefined)

      await authService.login('test@example.com', 'password123')
      await authService.logout()
      await authService.login('test@example.com', 'password123')

      expect((authService as any).currentUser).toEqual(mockUser)
    })

    it('should handle special characters in error messages', async () => {
      const specialError = new Error('auth/user-not-found: <script>alert("xss")</script>')
      ;(firebaseAuth.login as jest.Mock).mockRejectedValue(specialError)

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'メールアドレスまたはパスワードが正しくありません',
      )
    })
  })
})
