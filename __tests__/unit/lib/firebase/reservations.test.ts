import { reservationService } from '@/lib/firebase/reservations'
import { mockReservationService } from '@/lib/mock/mockFirebase'
import { Reservation } from '@/lib/types'
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
import { v4 as uuidv4 } from 'uuid'

// Mock Firebase
jest.mock('@/lib/firebase/config', () => ({
  db: {},
}))

jest.mock('firebase/firestore')
jest.mock('uuid')

jest.mock('@/lib/mock/mockFirebase', () => ({
  mockReservationService: {
    createReservation: jest.fn(),
    getReservation: jest.fn(),
    getUserReservations: jest.fn(),
    getAllReservations: jest.fn(),
    updateReservationStatus: jest.fn(),
    cancelReservation: jest.fn(),
    getReservationsByDate: jest.fn(),
  },
}))

// Mock environment variables
const originalEnv = process.env

describe('ReservationService - Firebase', () => {
  const mockReservation: Reservation = {
    id: 'res123',
    customerId: 'customer123',
    customerName: '山田太郎',
    customerEmail: 'yamada@example.com',
    customerPhone: '090-1234-5678',
    serviceType: '2D',
    serviceName: 'カット',
    price: 5000,
    date: '2025-08-01',
    time: '18:30',
    status: 'pending',
    notes: 'テストノート',
    createdAt: new Date('2025-07-01'),
    updatedAt: new Date('2025-07-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    ;(uuidv4 as jest.Mock).mockReturnValue('generated-uuid')
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Firebase Configuration', () => {
    it('should use mock service when Firebase is not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      ;(mockReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

      const result = await reservationService.getReservation('res123')

      expect(mockReservationService.getReservation).toHaveBeenCalledWith('res123')
      expect(result).toEqual(mockReservation)
    })

    it('should detect various non-configured states', async () => {
      const nonConfiguredKeys = ['', 'test-api-key', undefined]

      for (const key of nonConfiguredKeys) {
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY = key
        ;(mockReservationService.getAllReservations as jest.Mock).mockResolvedValue([])

        await reservationService.getAllReservations()

        expect(mockReservationService.getAllReservations).toHaveBeenCalled()
      }
    })
  })

  describe('createReservation', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should create a new reservation with generated ID', async () => {
      const newReservationData = {
        ...mockReservation,
        id: undefined,
        createdAt: undefined,
      } as Omit<Reservation, 'id' | 'createdAt'>

      ;(setDoc as jest.Mock).mockResolvedValue(undefined)
      ;(Timestamp.fromDate as jest.Mock).mockImplementation((date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
      }))

      const result = await reservationService.createReservation(newReservationData)

      expect(uuidv4).toHaveBeenCalled()
      expect(result.id).toBe('generated-uuid')
      expect(result.status).toBe('pending')
      expect(result.createdAt).toBeInstanceOf(Date)

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'generated-uuid',
          status: 'pending',
          date: expect.any(Object),
          createdAt: expect.any(Object),
        }),
      )
    })

    it('should convert date string to Timestamp', async () => {
      const reservationData = {
        ...mockReservation,
        date: '2025-08-01',
      } as Omit<Reservation, 'id' | 'createdAt'>

      ;(setDoc as jest.Mock).mockResolvedValue(undefined)

      await reservationService.createReservation(reservationData)

      expect(Timestamp.fromDate).toHaveBeenCalledWith(new Date('2025-08-01'))
    })

    it('should handle creation errors', async () => {
      ;(setDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'))

      await expect(reservationService.createReservation({} as any)).rejects.toThrow(
        'Firestore error',
      )
    })

    it('should use mock service when not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      const mockCreated = { ...mockReservation, id: 'mock-id' }
      ;(mockReservationService.createReservation as jest.Mock).mockResolvedValue(mockCreated)

      const result = await reservationService.createReservation({} as any)

      expect(mockReservationService.createReservation).toHaveBeenCalled()
      expect(result).toEqual(mockCreated)
    })
  })

  describe('getReservation', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve reservation by ID', async () => {
      const mockDocData = {
        ...mockReservation,
        date: { toDate: () => new Date('2025-08-01') },
        createdAt: { toDate: () => new Date('2025-07-01') },
      }
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      })

      const result = await reservationService.getReservation('res123')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'reservations', 'res123')
      expect(result).toEqual({
        ...mockReservation,
        date: new Date('2025-08-01'),
        createdAt: new Date('2025-07-01'),
      })
    })

    it('should return null for non-existent reservation', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      })

      const result = await reservationService.getReservation('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle missing date fields gracefully', async () => {
      const mockDocData = { ...mockReservation }
      delete (mockDocData as any).date
      delete (mockDocData as any).createdAt
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      })

      const result = await reservationService.getReservation('res123')

      expect(result).toBeTruthy()
    })

    it('should handle Firestore errors', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(reservationService.getReservation('res123')).rejects.toThrow('Network error')
    })
  })

  describe('getUserReservations', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve user reservations ordered by date', async () => {
      const mockDocs = [
        {
          data: () => ({
            ...mockReservation,
            id: 'res1',
            date: { toDate: () => new Date('2025-08-02') },
            createdAt: { toDate: () => new Date('2025-07-01') },
          }),
        },
        {
          data: () => ({
            ...mockReservation,
            id: 'res2',
            date: { toDate: () => new Date('2025-08-01') },
            createdAt: { toDate: () => new Date('2025-07-02') },
          }),
        },
      ]
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs })

      const result = await reservationService.getUserReservations('customer123')

      expect(query).toHaveBeenCalled()
      expect(where).toHaveBeenCalledWith('customerId', '==', 'customer123')
      expect(orderBy).toHaveBeenCalledWith('date', 'desc')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('res1')
    })

    it('should handle empty results', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })

      const result = await reservationService.getUserReservations('customer123')

      expect(result).toEqual([])
    })

    it('should handle query errors', async () => {
      ;(getDocs as jest.Mock).mockRejectedValue(new Error('Query failed'))

      await expect(reservationService.getUserReservations('customer123')).rejects.toThrow(
        'Query failed',
      )
    })
  })

  describe('getAllReservations', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve all reservations for admin', async () => {
      const mockDocs = [
        {
          data: () => ({
            ...mockReservation,
            id: 'res1',
            date: { toDate: () => new Date('2025-08-02') },
            createdAt: { toDate: () => new Date('2025-07-01') },
          }),
        },
      ]
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs })

      const result = await reservationService.getAllReservations()

      expect(query).toHaveBeenCalled()
      expect(orderBy).toHaveBeenCalledWith('date', 'desc')
      expect(result).toHaveLength(1)
    })

    it('should use mock service when not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      const mockReservations = [mockReservation]
      ;(mockReservationService.getAllReservations as jest.Mock).mockResolvedValue(mockReservations)

      const result = await reservationService.getAllReservations()

      expect(mockReservationService.getAllReservations).toHaveBeenCalled()
      expect(result).toEqual(mockReservations)
    })
  })

  describe('updateReservationStatus', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    const validStatuses: Array<'pending' | 'confirmed' | 'cancelled' | 'completed'> = [
      'pending',
      'confirmed',
      'cancelled',
      'completed',
    ]

    it.each(validStatuses)('should update status to %s', async (status) => {
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(Timestamp.now as jest.Mock).mockReturnValue({ seconds: 123, nanoseconds: 456 })

      await reservationService.updateReservationStatus('res123', status)

      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        status,
        updatedAt: { seconds: 123, nanoseconds: 456 },
      })
    })

    it('should handle update errors', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Update failed'))

      await expect(
        reservationService.updateReservationStatus('res123', 'confirmed'),
      ).rejects.toThrow('Update failed')
    })

    it('should use mock service when not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'

      await reservationService.updateReservationStatus('res123', 'confirmed')

      expect(mockReservationService.updateReservationStatus).toHaveBeenCalledWith(
        'res123',
        'confirmed',
      )
    })
  })

  describe('cancelReservation', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should cancel reservation with reason', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      const mockNow = { seconds: 123, nanoseconds: 456 }
      ;(Timestamp.now as jest.Mock).mockReturnValue(mockNow)

      await reservationService.cancelReservation('res123', 'Customer request')

      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        status: 'cancelled',
        cancelReason: 'Customer request',
        cancelledAt: mockNow,
        updatedAt: mockNow,
      })
    })

    it('should cancel reservation without reason', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await reservationService.cancelReservation('res123')

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'cancelled',
          cancelReason: '',
        }),
      )
    })

    it('should handle cancellation errors', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Cancellation failed'))

      await expect(reservationService.cancelReservation('res123')).rejects.toThrow(
        'Cancellation failed',
      )
    })
  })

  describe('getReservationsByDate', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should retrieve reservations for specific date', async () => {
      const testDate = new Date('2025-08-01T12:00:00')
      const mockDocs = [
        {
          data: () => ({
            ...mockReservation,
            date: { toDate: () => new Date('2025-08-01T18:30:00') },
            createdAt: { toDate: () => new Date('2025-07-01') },
          }),
        },
      ]
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs })

      const result = await reservationService.getReservationsByDate(testDate)

      // Check that date range is set correctly
      expect(Timestamp.fromDate).toHaveBeenCalledWith(new Date('2025-08-01T00:00:00.000Z'))
      expect(Timestamp.fromDate).toHaveBeenCalledWith(new Date('2025-08-01T23:59:59.999Z'))

      // Check query conditions
      expect(where).toHaveBeenCalledWith('date', '>=', expect.any(Object))
      expect(where).toHaveBeenCalledWith('date', '<=', expect.any(Object))
      expect(where).toHaveBeenCalledWith('status', '!=', 'cancelled')

      expect(result).toHaveLength(1)
    })

    it('should exclude cancelled reservations', async () => {
      const testDate = new Date('2025-08-01')
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })

      await reservationService.getReservationsByDate(testDate)

      expect(where).toHaveBeenCalledWith('status', '!=', 'cancelled')
    })

    it('should handle empty results', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })

      const result = await reservationService.getReservationsByDate(new Date())

      expect(result).toEqual([])
    })

    it('should handle date edge cases', async () => {
      const edgeDates = [
        new Date('2025-01-01T00:00:00'), // New Year
        new Date('2025-12-31T23:59:59'), // New Year's Eve
        new Date('2025-02-28T12:00:00'), // End of February
      ]

      for (const date of edgeDates) {
        jest.clearAllMocks()
        ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })

        await reservationService.getReservationsByDate(date)

        expect(Timestamp.fromDate).toHaveBeenCalled()
      }
    })

    it('should use mock service when not configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      const mockReservations = [mockReservation]
      ;(mockReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(
        mockReservations,
      )

      const result = await reservationService.getReservationsByDate(new Date())

      expect(mockReservationService.getReservationsByDate).toHaveBeenCalled()
      expect(result).toEqual(mockReservations)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'real-firebase-key'
    })

    it('should provide default error messages', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue({})

      await expect(reservationService.getReservation('res123')).rejects.toThrow(
        '予約の取得に失敗しました',
      )
    })

    it('should preserve specific error messages', async () => {
      const specificError = new Error('Specific Firestore error')
      ;(setDoc as jest.Mock).mockRejectedValue(specificError)

      await expect(reservationService.createReservation({} as any)).rejects.toThrow(
        'Specific Firestore error',
      )
    })

    it('should handle different error types', async () => {
      const errorTypes = [
        new Error('Standard error'),
        { message: 'Object with message' },
        'String error',
        null,
        undefined,
      ]

      for (const error of errorTypes) {
        jest.clearAllMocks()
        ;(updateDoc as jest.Mock).mockRejectedValue(error)

        await expect(
          reservationService.updateReservationStatus('res123', 'confirmed'),
        ).rejects.toThrow()
      }
    })
  })
})
