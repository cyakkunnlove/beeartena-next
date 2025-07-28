import { createMocks } from 'node-mocks-http'
import { GET as getReservationsHandler, POST as createReservationHandler } from '@/app/api/reservations/route'
import { GET as getSlotsHandler } from '@/app/api/reservations/slots/route'

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  db: {
    collection: jest.fn(() => ({
      add: jest.fn(),
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
  },
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue('server-timestamp'),
  },
}))

// Mock JWT
jest.mock('@/lib/api/jwt', () => ({
  verifyJWT: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

// Mock reservation service
jest.mock('@/lib/reservationService', () => ({
  reservationService: {
    checkAvailability: jest.fn(),
    getTimeSlotsForDate: jest.fn(),
  },
}))

describe('Reservations API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/reservations', () => {
    it('should return user reservations with valid token', async () => {
      const mockReservations = [
        {
          id: 'res-1',
          customerId: 'test-user-id',
          serviceId: '2D',
          serviceName: '2D眉毛',
          date: '2025-08-01',
          time: '10:00',
          status: 'confirmed',
          price: 30000,
          pointsUsed: 0,
        },
        {
          id: 'res-2',
          customerId: 'test-user-id',
          serviceId: '3D',
          serviceName: '3D眉毛',
          date: '2025-08-05',
          time: '14:00',
          status: 'pending',
          price: 50000,
          pointsUsed: 1000,
        },
      ]

      const { db } = require('@/lib/firebase/admin')
      
      db.collection().where().orderBy().get.mockResolvedValue({
        docs: mockReservations.map(res => ({
          id: res.id,
          data: () => res,
        })),
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await getReservationsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        id: 'res-1',
        serviceName: '2D眉毛',
        date: '2025-08-01',
        time: '10:00',
        status: 'confirmed',
      })
    })

    it('should return empty array when user has no reservations', async () => {
      const { db } = require('@/lib/firebase/admin')
      
      db.collection().where().orderBy().get.mockResolvedValue({
        docs: [],
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await getReservationsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should fail without authentication', async () => {
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await getReservationsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })

  describe('POST /api/reservations', () => {
    it('should create reservation successfully', async () => {
      const newReservation = {
        serviceId: '2D',
        date: '2025-08-01',
        time: '10:00',
        formData: {
          name: 'テスト太郎',
          email: 'test@example.com',
          phone: '090-1234-5678',
          notes: 'テストメモ',
        },
        pointsUsed: 0,
      }

      const { reservationService } = require('@/lib/reservationService')
      const { db } = require('@/lib/firebase/admin')

      // Mock availability check
      reservationService.checkAvailability.mockResolvedValue(true)

      // Mock user data
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-user-id',
          points: 5000,
        }),
      })

      // Mock reservation creation
      const mockDocRef = { id: 'new-res-id' }
      db.collection().add.mockResolvedValue(mockDocRef)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: newReservation,
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: 'new-res-id',
        message: '予約が確定しました',
      })
      
      expect(db.collection).toHaveBeenCalledWith('reservations')
      expect(db.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'test-user-id',
          serviceId: '2D',
          serviceName: '2D眉毛',
          date: '2025-08-01',
          time: '10:00',
          status: 'confirmed',
          price: 30000,
          pointsUsed: 0,
        })
      )
    })

    it('should fail when time slot is not available', async () => {
      const { reservationService } = require('@/lib/reservationService')
      
      // Mock slot not available
      reservationService.checkAvailability.mockResolvedValue(false)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          serviceId: '2D',
          date: '2025-08-01',
          time: '10:00',
          formData: {
            name: 'テスト太郎',
            email: 'test@example.com',
            phone: '090-1234-5678',
          },
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('選択した時間帯は既に予約が入っています')
    })

    it('should validate required fields', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          serviceId: '2D',
          // Missing date and time
          formData: {
            name: 'テスト太郎',
            email: 'test@example.com',
          },
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('必須')
    })

    it('should handle points usage correctly', async () => {
      const { reservationService } = require('@/lib/reservationService')
      const { db } = require('@/lib/firebase/admin')

      reservationService.checkAvailability.mockResolvedValue(true)

      // Mock user with points
      const mockUserGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-user-id',
          points: 5000,
        }),
      })
      const mockUserUpdate = jest.fn()
      
      db.collection().doc.mockReturnValue({
        get: mockUserGet,
        update: mockUserUpdate,
      })

      // Mock reservation creation
      db.collection().add.mockResolvedValue({ id: 'new-res-id' })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          serviceId: '3D',
          date: '2025-08-01',
          time: '14:00',
          formData: {
            name: 'テスト太郎',
            email: 'test@example.com',
            phone: '090-1234-5678',
          },
          pointsUsed: 1000,
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      
      // Check points were deducted
      expect(mockUserUpdate).toHaveBeenCalledWith({
        points: 4000, // 5000 - 1000
      })
      
      // Check reservation includes points used
      expect(db.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          pointsUsed: 1000,
          price: 50000,
        })
      )
    })

    it('should fail if user does not have enough points', async () => {
      const { db } = require('@/lib/firebase/admin')

      // Mock user with insufficient points
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-user-id',
          points: 500,
        }),
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          serviceId: '2D',
          date: '2025-08-01',
          time: '10:00',
          formData: {
            name: 'テスト太郎',
            email: 'test@example.com',
            phone: '090-1234-5678',
          },
          pointsUsed: 1000, // More than available
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ポイントが不足しています')
    })
  })

  describe('GET /api/reservations/slots', () => {
    it('should return available time slots for a date', async () => {
      const mockSlots = [
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '12:00', available: false },
        { time: '13:00', available: true },
        { time: '14:00', available: false },
        { time: '15:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true },
      ]

      const { reservationService } = require('@/lib/reservationService')
      reservationService.getTimeSlotsForDate.mockResolvedValue(mockSlots)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/reservations/slots?date=2025-08-01',
        query: {
          date: '2025-08-01',
        },
      })

      const response = await getSlotsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSlots)
      expect(reservationService.getTimeSlotsForDate).toHaveBeenCalledWith('2025-08-01')
    })

    it('should validate date parameter', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {}, // Missing date
      })

      const response = await getSlotsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('日付パラメータが必要です')
    })

    it('should handle service errors gracefully', async () => {
      const { reservationService } = require('@/lib/reservationService')
      reservationService.getTimeSlotsForDate.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'GET',
        query: {
          date: '2025-08-01',
        },
      })

      const response = await getSlotsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('時間枠の取得に失敗しました')
    })
  })
})