import { userService } from '@/lib/firebase/users'
import { mockUserService } from '@/lib/mock/mockFirebase'
import { User } from '@/lib/types'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/firebase/config', () => ({
  db: {},
}))

jest.mock('firebase/firestore')

jest.mock('@/lib/mock/mockFirebase', () => ({
  mockUserService: {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    updateUser: jest.fn(),
  },
}))

// Mock environment variables
const originalEnv = process.env

describe('UserService', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: '山田太郎',
    phone: '090-1234-5678',
    role: 'customer',
    points: 100,
    birthday: '1990-01-01',
    lastBirthdayPointsYear: 2025,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  // Mock document reference
  const mockDocRef = { id: 'mock-doc-ref' }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    // Mock doc function to return a reference
    ;(doc as jest.Mock).mockReturnValue(mockDocRef)
    // Mock collection function
    ;(collection as jest.Mock).mockReturnValue({ id: 'users' })
    // Mock query function
    ;(query as jest.Mock).mockReturnValue({ type: 'query' })
    // Mock where function
    ;(where as jest.Mock).mockReturnValue({ type: 'where' })
    // Mock orderBy function
    ;(orderBy as jest.Mock).mockReturnValue({ type: 'orderBy' })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Firebase Configuration Check', () => {
    it('should use mock service when Firebase is not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      ;(mockUserService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const result = await userService.getUser('user123')

      expect(mockUserService.getUser).toHaveBeenCalledWith('user123')
      expect(result).toEqual(mockUser)
    })

    it('should use Firebase when properly configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
      const mockDocData = {
        ...mockUser,
        createdAt: { toDate: () => mockUser.createdAt },
      }
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      })

      const result = await userService.getUser('user123')

      expect(getDoc).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })
  })

  describe('createUser', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should create a new user', async () => {
      ;(setDoc as jest.Mock).mockResolvedValue(undefined)
      ;(Timestamp.fromDate as jest.Mock).mockReturnValue({ seconds: 123, nanoseconds: 456 })

      await userService.createUser(mockUser)

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          ...mockUser,
          createdAt: expect.any(Object),
        }),
      )
    })

    it('should handle creation errors', async () => {
      ;(setDoc as jest.Mock).mockRejectedValue(new Error('Firebase error'))

      await expect(userService.createUser(mockUser)).rejects.toThrow('Firebase error')
    })

    it('should convert Date to Timestamp', async () => {
      const mockTimestamp = { seconds: 123, nanoseconds: 456 }
      ;(Timestamp.fromDate as jest.Mock).mockReturnValue(mockTimestamp)
      ;(setDoc as jest.Mock).mockResolvedValue(undefined)

      await userService.createUser(mockUser)

      expect(Timestamp.fromDate).toHaveBeenCalledWith(mockUser.createdAt)
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          createdAt: mockTimestamp,
        }),
      )
    })

    it('should skip creation when Firebase is not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'

      await userService.createUser(mockUser)

      expect(setDoc).not.toHaveBeenCalled()
    })
  })

  describe('getUser', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve user by id', async () => {
      const mockDocData = {
        ...mockUser,
        createdAt: { toDate: () => mockUser.createdAt },
      }
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      })

      const result = await userService.getUser('user123')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'user123')
      expect(result).toEqual(mockUser)
    })

    it('should return null for non-existent user', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      })

      const result = await userService.getUser('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle missing createdAt field', async () => {
      const userWithoutCreatedAt = { ...mockUser }
      delete (userWithoutCreatedAt as any).createdAt
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => userWithoutCreatedAt,
      })

      const result = await userService.getUser('user123')

      expect(result?.createdAt).toBeInstanceOf(Date)
    })

    it('should handle Firebase errors', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(userService.getUser('user123')).rejects.toThrow('Network error')
    })
  })

  describe('getUserByEmail', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should find user by email', async () => {
      const mockDocData = {
        ...mockUser,
        createdAt: { toDate: () => mockUser.createdAt },
      }
      ;(getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => mockDocData,
          },
        ],
      })

      const result = await userService.getUserByEmail('test@example.com')

      expect(query).toHaveBeenCalled()
      expect(where).toHaveBeenCalledWith('email', '==', 'test@example.com')
      expect(result).toEqual(mockUser)
    })

    it('should return null when no user found', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      })

      const result = await userService.getUserByEmail('notfound@example.com')

      expect(result).toBeNull()
    })

    it('should return first user if multiple matches', async () => {
      const mockDocData1 = { ...mockUser, id: 'user1' }
      const mockDocData2 = { ...mockUser, id: 'user2' }
      ;(getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          { data: () => ({ ...mockDocData1, createdAt: { toDate: () => new Date() } }) },
          { data: () => ({ ...mockDocData2, createdAt: { toDate: () => new Date() } }) },
        ],
      })

      const result = await userService.getUserByEmail('test@example.com')

      expect(result?.id).toBe('user1')
    })

    it('should return null when Firebase not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'

      const result = await userService.getUserByEmail('test@example.com')

      expect(result).toBeNull()
      expect(getDocs).not.toHaveBeenCalled()
    })
  })

  describe('getAllUsers', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve all users ordered by creation date', async () => {
      const users = [
        { ...mockUser, id: 'user1', createdAt: { toDate: () => new Date('2025-01-01') } },
        { ...mockUser, id: 'user2', createdAt: { toDate: () => new Date('2025-01-02') } },
      ]
      ;(getDocs as jest.Mock).mockResolvedValue({
        docs: users.map((u) => ({ data: () => u })),
      })

      const result = await userService.getAllUsers()

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('user1')
    })

    it('should handle empty user list', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })

      const result = await userService.getAllUsers()

      expect(result).toEqual([])
    })

    it('should use mock service when Firebase not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      const mockUsers = [mockUser]
      ;(mockUserService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers)

      const result = await userService.getAllUsers()

      expect(mockUserService.getAllUsers).toHaveBeenCalled()
      expect(result).toEqual(mockUsers)
    })

    it('should handle query errors', async () => {
      ;(getDocs as jest.Mock).mockRejectedValue(new Error('Query failed'))

      await expect(userService.getAllUsers()).rejects.toThrow('Query failed')
    })
  })

  describe('updateUser', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should update user fields', async () => {
      const updates = { name: '新しい名前', phone: '090-9876-5432' }
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(Timestamp.now as jest.Mock).mockReturnValue({ seconds: 123, nanoseconds: 456 })

      await userService.updateUser('user123', updates)

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: { seconds: 123, nanoseconds: 456 },
        }),
      )
    })

    it('should convert createdAt to Timestamp if included', async () => {
      const newCreatedAt = new Date('2025-02-01')
      const updates = { createdAt: newCreatedAt }
      const mockTimestamp = { seconds: 789, nanoseconds: 123 }
      ;(Timestamp.fromDate as jest.Mock).mockReturnValue(mockTimestamp)
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await userService.updateUser('user123', updates)

      expect(Timestamp.fromDate).toHaveBeenCalledWith(newCreatedAt)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          createdAt: mockTimestamp,
        }),
      )
    })

    it('should use mock service when Firebase not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      const updates = { name: '新しい名前' }

      await userService.updateUser('user123', updates)

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user123', updates)
      expect(updateDoc).not.toHaveBeenCalled()
    })

    it('should handle update errors', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Update failed'))

      await expect(userService.updateUser('user123', {})).rejects.toThrow('Update failed')
    })
  })

  describe('calculateUserRank', () => {
    it('should return Bronze for spent < 100,000', () => {
      expect(userService.calculateUserRank(0)).toBe('Bronze')
      expect(userService.calculateUserRank(50000)).toBe('Bronze')
      expect(userService.calculateUserRank(99999)).toBe('Bronze')
    })

    it('should return Silver for spent >= 100,000 and < 300,000', () => {
      expect(userService.calculateUserRank(100000)).toBe('Silver')
      expect(userService.calculateUserRank(200000)).toBe('Silver')
      expect(userService.calculateUserRank(299999)).toBe('Silver')
    })

    it('should return Gold for spent >= 300,000 and < 500,000', () => {
      expect(userService.calculateUserRank(300000)).toBe('Gold')
      expect(userService.calculateUserRank(400000)).toBe('Gold')
      expect(userService.calculateUserRank(499999)).toBe('Gold')
    })

    it('should return Platinum for spent >= 500,000', () => {
      expect(userService.calculateUserRank(500000)).toBe('Platinum')
      expect(userService.calculateUserRank(1000000)).toBe('Platinum')
    })

    it('should handle negative amounts', () => {
      expect(userService.calculateUserRank(-1000)).toBe('Bronze')
    })
  })

  describe('updateTotalSpent', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should update total spent and rank', async () => {
      const mockDocData = { totalSpent: 95000 }
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(Timestamp.now as jest.Mock).mockReturnValue({ seconds: 123, nanoseconds: 456 })

      await userService.updateTotalSpent('user123', 10000)

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalSpent: 105000,
          rank: 'Silver', // 95000 + 10000 = 105000, which is Silver
          updatedAt: { seconds: 123, nanoseconds: 456 },
        }),
      )
    })

    it('should handle users with no previous totalSpent', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}), // No totalSpent field
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await userService.updateTotalSpent('user123', 5000)

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalSpent: 5000,
          rank: 'Bronze',
        }),
      )
    })

    it('should throw error for non-existent user', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      })

      await expect(userService.updateTotalSpent('nonexistent', 5000)).rejects.toThrow(
        'ユーザーが見つかりません',
      )
    })

    it('should skip update when Firebase not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'

      await userService.updateTotalSpent('user123', 5000)

      expect(getDoc).not.toHaveBeenCalled()
      expect(updateDoc).not.toHaveBeenCalled()
    })

    it('should handle rank transitions correctly', async () => {
      const testCases = [
        { current: 99000, add: 2000, expectedRank: 'Silver' },
        { current: 299000, add: 2000, expectedRank: 'Gold' },
        { current: 499000, add: 2000, expectedRank: 'Platinum' },
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        ;(getDoc as jest.Mock).mockResolvedValue({
          exists: () => true,
          data: () => ({ totalSpent: testCase.current }),
        })
        ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

        await userService.updateTotalSpent('user123', testCase.add)

        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            totalSpent: testCase.current + testCase.add,
            rank: testCase.expectedRank,
          }),
        )
      }
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should provide default error message when error has no message', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue({})

      await expect(userService.getUser('user123')).rejects.toThrow('ユーザーの取得に失敗しました')
    })

    it('should preserve specific error messages', async () => {
      const specificError = new Error('Specific Firebase error')
      ;(setDoc as jest.Mock).mockRejectedValue(specificError)

      await expect(userService.createUser(mockUser)).rejects.toThrow('Specific Firebase error')
    })
  })
})
