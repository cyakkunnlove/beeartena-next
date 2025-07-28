import { NextRequest } from 'next/server'
import {
  GET as getReservationsHandler,
  POST as createReservationHandler,
} from '@/app/api/reservations/route'
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

// Mock reservations service
jest.mock('@/lib/firebase/reservations', () => ({
  reservationsService: {
    getReservations: jest.fn(),
    createReservation: jest.fn(),
    getReservation: jest.fn(),
    getReservationsByDate: jest.fn(),
  },
}))

// Mock users service
jest.mock('@/lib/firebase/users', () => ({
  userService: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
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
    getUserReservations: jest.fn(),
    getAllReservations: jest.fn(),
    createReservation: jest.fn(),
  },
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

      const { reservationService } = require('@/lib/reservationService')
      reservationService.getUserReservations.mockResolvedValue(mockReservations)

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await getReservationsHandler(req)
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
      const { reservationService } = require('@/lib/reservationService')
      reservationService.getUserReservations.mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      const response = await getReservationsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should fail without authentication', async () => {
      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'GET',
      })

      const response = await getReservationsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })

  describe('POST /api/reservations', () => {
    it('should create reservation successfully', async () => {
      const newReservation = {
        serviceId: '2D',
        serviceName: '2D眉毛',
        price: 30000,
        date: '2025-08-01',
        time: '10:00',
        customerName: 'テスト太郎',
        customerEmail: 'test@example.com',
        customerPhone: '090-1234-5678',
        notes: 'テストメモ',
        pointsUsed: 0,
      }

      const { reservationService } = require('@/lib/reservationService')
      const { db } = require('@/lib/firebase/admin')

      // Mock availability check
      reservationService.getTimeSlotsForDate.mockResolvedValue([
        { time: '10:00', available: true },
        { time: '11:00', available: false },
      ])

      // Mock reservation creation
      reservationService.createReservation.mockResolvedValue({
        id: 'new-res-id',
        message: '予約が確定しました',
      })

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(newReservation),
      })

      const response = await createReservationHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: 'new-res-id',
        message: '予約が確定しました',
      })

      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: '2D',
          serviceName: '2D眉毛',
          date: '2025-08-01',
          time: '10:00',
          price: 30000,
          pointsUsed: 0,
        }),
      )
    })

    it('should fail when time slot is not available', async () => {
      const { reservationService } = require('@/lib/reservationService')

      // Mock slot not available
      reservationService.getTimeSlotsForDate.mockResolvedValue([
        { time: '10:00', available: false },
      ])

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: '2D',
          serviceName: '2D眉毛',
          price: 30000,
          date: '2025-08-01',
          time: '10:00',
          customerName: 'テスト太郎',
          customerEmail: 'test@example.com',
          customerPhone: '090-1234-5678',
        }),
      })

      const response = await createReservationHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('選択された時間枠は予約できません')
    })

    it('should validate required fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: '2D',
          // Missing date and time
          customerName: 'テスト太郎',
          customerEmail: 'test@example.com',
        }),
      })

      const response = await createReservationHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('必須')
    })

    it('should handle points usage correctly', async () => {
      const { reservationService } = require('@/lib/reservationService')

      // Mock time slots
      reservationService.getTimeSlotsForDate.mockResolvedValue([{ time: '14:00', available: true }])

      // Mock reservation creation with points
      reservationService.createReservation.mockResolvedValue({
        id: 'new-res-id',
        message: '予約が確定しました',
      })

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: '3D',
          serviceName: '3D眉毛',
          price: 50000,
          date: '2025-08-01',
          time: '14:00',
          customerName: 'テスト太郎',
          customerEmail: 'test@example.com',
          customerPhone: '090-1234-5678',
          pointsUsed: 1000,
        }),
      })

      const response = await createReservationHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)

      // Check reservation includes points used
      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          pointsUsed: 1000,
          price: 50000,
        }),
      )
    })

    it('should fail if user does not have enough points', async () => {
      const { reservationService } = require('@/lib/reservationService')

      // Mock time slots
      reservationService.getTimeSlotsForDate.mockResolvedValue([{ time: '10:00', available: true }])

      // Mock reservation creation to fail due to insufficient points
      reservationService.createReservation.mockRejectedValue(new Error('ポイントが不足しています'))

      const req = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: '2D',
          serviceName: '2D眉毛',
          price: 30000,
          date: '2025-08-01',
          time: '10:00',
          customerName: 'テスト太郎',
          customerEmail: 'test@example.com',
          customerPhone: '090-1234-5678',
          pointsUsed: 1000, // More than available
        }),
      })

      const response = await createReservationHandler(req)
      const data = await response.json()

      expect(response.status).toBe(500)
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

      const req = new NextRequest('http://localhost:3000/api/reservations/slots?date=2025-08-01', {
        method: 'GET',
      })

      const response = await getSlotsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSlots)
      expect(reservationService.getTimeSlotsForDate).toHaveBeenCalledWith('2025-08-01')
    })

    it('should validate date parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/reservations/slots', {
        method: 'GET',
      })

      const response = await getSlotsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('日付パラメータが必要です')
    })

    it('should handle service errors gracefully', async () => {
      const { reservationService } = require('@/lib/reservationService')
      reservationService.getTimeSlotsForDate.mockRejectedValue(new Error('Database error'))

      const req = new NextRequest('http://localhost:3000/api/reservations/slots?date=2025-08-01', {
        method: 'GET',
      })

      const response = await getSlotsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })
})
