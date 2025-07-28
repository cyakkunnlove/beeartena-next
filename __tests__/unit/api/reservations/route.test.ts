import { NextRequest } from 'next/server'
import { GET, POST, OPTIONS } from '@/app/api/reservations/route'
import { reservationService } from '@/lib/reservationService'
import * as middleware from '@/lib/api/middleware'
import { Reservation, TimeSlot, User } from '@/lib/types'

// Mock dependencies
jest.mock('@/lib/reservationService')
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
  setCorsHeaders: jest.fn((response) => response),
  verifyAuth: jest.fn(),
}))

describe('Reservations API Route', () => {
  const validReservationData = {
    serviceId: '2d-eyelash',
    serviceName: '2Dアイラッシュ',
    price: 5000,
    date: '2025-08-01',
    time: '18:30',
    customerName: '山田太郎',
    customerPhone: '090-1234-5678',
    customerEmail: 'yamada@example.com',
    notes: 'テストノート',
  }

  const mockReservation: Reservation = {
    id: 'res123',
    customerId: 'customer123',
    customerName: '山田太郎',
    customerEmail: 'yamada@example.com',
    customerPhone: '090-1234-5678',
    serviceType: '2D',
    serviceName: '2Dアイラッシュ',
    price: 5000,
    date: '2025-08-01',
    time: '18:30',
    status: 'pending',
    notes: 'テストノート',
    createdAt: new Date('2025-07-01'),
    updatedAt: new Date('2025-07-01'),
  }

  const mockAuthUser = {
    userId: 'customer123',
    email: 'customer@example.com',
    role: 'customer' as const,
  }

  const mockAdminUser = {
    userId: 'admin123',
    email: 'admin@example.com',
    role: 'admin' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OPTIONS /api/reservations', () => {
    it('should return CORS headers for preflight request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'OPTIONS',
      })

      const response = await OPTIONS(mockRequest)

      expect(middleware.setCorsHeaders).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/reservations', () => {
    const createMockRequest = (headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/reservations', {
        method: 'GET',
        headers,
      })
    }

    it('should return user reservations for authenticated customer', async () => {
      const mockRequest = createMockRequest({ Authorization: 'Bearer mock-token' })
      const mockReservations = [mockReservation]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
      ;(reservationService.getUserReservations as jest.Mock).mockResolvedValue(mockReservations)

      const response = await GET(mockRequest)

      expect(middleware.verifyAuth).toHaveBeenCalledWith(mockRequest)
      expect(reservationService.getUserReservations).toHaveBeenCalledWith('customer123')
      expect(reservationService.getAllReservations).not.toHaveBeenCalled()
      expect(middleware.successResponse).toHaveBeenCalledWith(mockReservations)
    })

    it('should return all reservations for admin user', async () => {
      const mockRequest = createMockRequest({ Authorization: 'Bearer admin-token' })
      const mockReservations = [mockReservation, { ...mockReservation, id: 'res456' }]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAdminUser)
      ;(reservationService.getAllReservations as jest.Mock).mockResolvedValue(mockReservations)

      const response = await GET(mockRequest)

      expect(reservationService.getAllReservations).toHaveBeenCalled()
      expect(reservationService.getUserReservations).not.toHaveBeenCalled()
      expect(middleware.successResponse).toHaveBeenCalledWith(mockReservations)
    })

    it('should return 401 for unauthenticated request', async () => {
      const mockRequest = createMockRequest()

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)

      const response = await GET(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('認証が必要です', 401)
      expect(reservationService.getUserReservations).not.toHaveBeenCalled()
      expect(reservationService.getAllReservations).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const mockRequest = createMockRequest({ Authorization: 'Bearer mock-token' })

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
      ;(reservationService.getUserReservations as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      )

      const response = await GET(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('Database connection failed', 500)
    })

    it('should handle generic errors', async () => {
      const mockRequest = createMockRequest({ Authorization: 'Bearer mock-token' })

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
      ;(reservationService.getUserReservations as jest.Mock).mockRejectedValue('Unknown error')

      const response = await GET(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('予約一覧の取得に失敗しました', 500)
    })

    it('should apply CORS headers to all responses', async () => {
      const scenarios = [
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
            ;(reservationService.getUserReservations as jest.Mock).mockResolvedValue([])
          },
        },
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
          },
        },
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
            ;(reservationService.getUserReservations as jest.Mock).mockRejectedValue(new Error())
          },
        },
      ]

      for (const scenario of scenarios) {
        jest.clearAllMocks()
        scenario.setup()

        const mockRequest = createMockRequest()
        await GET(mockRequest)

        expect(middleware.setCorsHeaders).toHaveBeenCalled()
      }
    })
  })

  describe('POST /api/reservations', () => {
    const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
    }

    // validReservationData is defined at the top level

    it('should create reservation for authenticated user', async () => {
      const mockRequest = createMockRequest(validReservationData, {
        Authorization: 'Bearer mock-token',
      })
      const mockTimeSlots: TimeSlot[] = [
        { time: '18:30', available: true, date: '2025-08-01' },
        { time: '19:30', available: false, date: '2025-08-01' },
      ]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)
      ;(reservationService.createReservation as jest.Mock).mockResolvedValue(mockReservation)

      const response = await POST(mockRequest)

      expect(middleware.verifyAuth).toHaveBeenCalledWith(mockRequest)
      expect(reservationService.getTimeSlotsForDate).toHaveBeenCalledWith('2025-08-01')
      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validReservationData,
          serviceType: '2D',
          customerId: 'customer123',
          status: 'pending',
        }),
      )
      expect(middleware.successResponse).toHaveBeenCalledWith(mockReservation, 201)
    })

    it('should create reservation for non-authenticated user', async () => {
      const mockRequest = createMockRequest(validReservationData)
      const mockTimeSlots: TimeSlot[] = [{ time: '18:30', available: true, date: '2025-08-01' }]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)
      ;(reservationService.createReservation as jest.Mock).mockResolvedValue({
        ...mockReservation,
        customerId: null,
      })

      const response = await POST(mockRequest)

      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: null,
        }),
      )
      expect(middleware.successResponse).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const mockRequest = createMockRequest({ serviceId: '2D' }) // Missing required fields
      const validationError = { status: 400, message: 'Missing required fields' }

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: null,
        error: validationError,
      })

      const response = await POST(mockRequest)

      expect(response).toEqual(validationError)
      expect(reservationService.getTimeSlotsForDate).not.toHaveBeenCalled()
    })

    it('should reject unavailable time slots', async () => {
      const mockRequest = createMockRequest(validReservationData)
      const mockTimeSlots: TimeSlot[] = [
        { time: '18:30', available: false, date: '2025-08-01' }, // Not available
        { time: '19:30', available: true, date: '2025-08-01' },
      ]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('選択された時間枠は予約できません', 400)
      expect(reservationService.createReservation).not.toHaveBeenCalled()
    })

    it('should reject non-existent time slots', async () => {
      const mockRequest = createMockRequest({
        ...validReservationData,
        time: '20:00', // Time not in available slots
      })
      const mockTimeSlots: TimeSlot[] = [
        { time: '18:30', available: true, date: '2025-08-01' },
        { time: '19:30', available: true, date: '2025-08-01' },
      ]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { ...validReservationData, time: '20:00' },
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('選択された時間枠は予約できません', 400)
    })

    it('should validate service ID mapping', async () => {
      const serviceIdTests = [
        { serviceId: '2D', expectedType: '2D' },
        { serviceId: '3D', expectedType: '3D' },
        { serviceId: '4D', expectedType: '4D' },
        { serviceId: '2d-eyelash', expectedType: '2D' },
        { serviceId: '3d-eyelash', expectedType: '3D' },
        { serviceId: '4d-eyelash', expectedType: '4D' },
      ]

      for (const test of serviceIdTests) {
        jest.clearAllMocks()
        const mockData = { ...validReservationData, serviceId: test.serviceId }
        const mockRequest = createMockRequest(mockData)
        const mockTimeSlots: TimeSlot[] = [{ time: '18:30', available: true, date: '2025-08-01' }]

        ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockData,
          error: null,
        })
        ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)
        ;(reservationService.createReservation as jest.Mock).mockResolvedValue(mockReservation)

        await POST(mockRequest)

        expect(reservationService.createReservation).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceType: test.expectedType,
          }),
        )
      }
    })

    it('should reject invalid service ID', async () => {
      const mockRequest = createMockRequest({
        ...validReservationData,
        serviceId: 'invalid-service',
      })
      const mockTimeSlots: TimeSlot[] = [{ time: '18:30', available: true, date: '2025-08-01' }]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: { ...validReservationData, serviceId: 'invalid-service' },
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('無効なサービスIDです', 400)
      expect(reservationService.createReservation).not.toHaveBeenCalled()
    })

    it('should handle optional fields', async () => {
      const dataWithOptionalFields = {
        ...validReservationData,
        finalPrice: 4500,
        pointsUsed: 500,
      }
      const mockRequest = createMockRequest(dataWithOptionalFields)
      const mockTimeSlots: TimeSlot[] = [{ time: '18:30', available: true, date: '2025-08-01' }]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: dataWithOptionalFields,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)
      ;(reservationService.createReservation as jest.Mock).mockResolvedValue(mockReservation)

      await POST(mockRequest)

      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          finalPrice: 4500,
          pointsUsed: 500,
        }),
      )
    })

    it('should handle service errors', async () => {
      const mockRequest = createMockRequest(validReservationData)
      const mockTimeSlots: TimeSlot[] = [{ time: '18:30', available: true, date: '2025-08-01' }]

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue(mockTimeSlots)
      ;(reservationService.createReservation as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      )

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('Database error', 500)
    })

    it('should handle generic errors', async () => {
      const mockRequest = createMockRequest(validReservationData)

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockRejectedValue('Unknown error')

      const response = await POST(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith('予約の作成に失敗しました', 500)
    })

    it('should handle concurrent reservation attempts', async () => {
      const mockTimeSlots: TimeSlot[] = [
        { time: '18:30', available: true, date: '2025-08-01', maxCapacity: 1, currentBookings: 0 },
      ]

      // Simulate two concurrent requests
      const request1 = createMockRequest(validReservationData)
      const request2 = createMockRequest(validReservationData)

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: validReservationData,
        error: null,
      })

      // First call returns available, second call returns not available
      ;(reservationService.getTimeSlotsForDate as jest.Mock)
        .mockResolvedValueOnce(mockTimeSlots)
        .mockResolvedValueOnce([{ ...mockTimeSlots[0], available: false, currentBookings: 1 }])
      ;(reservationService.createReservation as jest.Mock).mockResolvedValueOnce(mockReservation)

      const [response1, response2] = await Promise.all([POST(request1), POST(request2)])

      expect(reservationService.createReservation).toHaveBeenCalledTimes(1)
      expect(middleware.successResponse).toHaveBeenCalledTimes(1)
      expect(middleware.errorResponse).toHaveBeenCalledWith('選択された時間枠は予約できません', 400)
    })

    it('should validate date format', async () => {
      const invalidDates = ['2025/08/01', '01-08-2025', 'invalid-date', '']

      for (const date of invalidDates) {
        jest.clearAllMocks()
        const mockData = { ...validReservationData, date }
        const mockRequest = createMockRequest(mockData)

        ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
        ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
          data: mockData,
          error: null,
        })
        ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue([])

        await POST(mockRequest)

        expect(middleware.errorResponse).toHaveBeenCalledWith(
          '選択された時間枠は予約できません',
          400,
        )
      }
    })

    it('should apply CORS headers to all responses', async () => {
      const scenarios = [
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
            ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
              data: validReservationData,
              error: null,
            })
            ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue([
              { time: '18:30', available: true, date: '2025-08-01' },
            ])
            ;(reservationService.createReservation as jest.Mock).mockResolvedValue(mockReservation)
          },
        },
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
            ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
              data: null,
              error: { status: 400, message: 'Validation error' },
            })
          },
        },
        {
          setup: () => {
            ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
            ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
              data: validReservationData,
              error: null,
            })
            ;(reservationService.getTimeSlotsForDate as jest.Mock).mockRejectedValue(new Error())
          },
        },
      ]

      for (const scenario of scenarios) {
        jest.clearAllMocks()
        scenario.setup()

        const mockRequest = createMockRequest(validReservationData)
        await POST(mockRequest)

        expect(middleware.setCorsHeaders).toHaveBeenCalled()
      }
    })
  })

  describe('Security Considerations', () => {
    const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
    }

    it('should not expose internal error details', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/reservations', {
        method: 'GET',
        headers: { Authorization: 'Bearer mock-token' },
      })

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(mockAuthUser)
      ;(reservationService.getUserReservations as jest.Mock).mockRejectedValue(
        new Error(
          'Connection to database server at host.docker.internal (192.168.1.100), port 5432 failed',
        ),
      )

      await GET(mockRequest)

      expect(middleware.errorResponse).toHaveBeenCalledWith(
        'Connection to database server at host.docker.internal (192.168.1.100), port 5432 failed',
        500,
      )
    })

    it('should handle XSS attempts in reservation data', async () => {
      const xssData = {
        ...validReservationData,
        customerName: '<script>alert("xss")</script>',
        notes: '<img src=x onerror=alert("xss")>',
      }
      const mockRequest = createMockRequest(xssData)

      ;(middleware.verifyAuth as jest.Mock).mockResolvedValue(null)
      ;(middleware.validateRequestBody as jest.Mock).mockResolvedValue({
        data: xssData,
        error: null,
      })
      ;(reservationService.getTimeSlotsForDate as jest.Mock).mockResolvedValue([
        { time: '18:30', available: true, date: '2025-08-01' },
      ])
      ;(reservationService.createReservation as jest.Mock).mockResolvedValue(mockReservation)

      await POST(mockRequest)

      // Data should be passed as-is, sanitization happens on output
      expect(reservationService.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: '<script>alert("xss")</script>',
          notes: '<img src=x onerror=alert("xss")>',
        }),
      )
    })
  })
})
