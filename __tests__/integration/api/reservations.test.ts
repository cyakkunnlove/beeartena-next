import { createMocks } from 'node-mocks-http'
import { GET as getReservationsHandler, POST as createReservationHandler } from '@/app/api/reservations/route'
import { GET as getSlotsHandler } from '@/app/api/reservations/slots/route'
import { signJWT } from '@/lib/api/jwt'
import { createMockReservation, createMockUser } from '@/test/utils/mockData'

jest.mock('@/lib/firebase/config', () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
      add: jest.fn(),
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
    })),
  },
}))

describe('Reservations API Integration Tests', () => {
  const mockUser = createMockUser()
  const mockReservations = [
    createMockReservation({ userId: mockUser.id }),
    createMockReservation({ userId: mockUser.id }),
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/reservations', () => {
    it('should get user reservations with valid token', async () => {
      const token = await signJWT({ userId: mockUser.id })
      const { db } = require('@/lib/firebase/config')
      
      db.collection().where().orderBy().get.mockResolvedValue({
        docs: mockReservations.map(r => ({
          id: r.id,
          data: () => r,
        })),
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      const response = await getReservationsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        id: mockReservations[0].id,
        userId: mockUser.id,
      })
    })

    it('should return empty array for user with no reservations', async () => {
      const token = await signJWT({ userId: 'new-user' })
      const { db } = require('@/lib/firebase/config')
      
      db.collection().where().orderBy().get.mockResolvedValue({
        docs: [],
      })

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
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
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/reservations', () => {
    it('should create reservation with valid data', async () => {
      const token = await signJWT({ userId: mockUser.id })
      const { db } = require('@/lib/firebase/config')
      const newReservation = {
        date: '2024-01-20',
        time: '14:00',
        service: 'カット',
      }

      db.collection().add.mockResolvedValue({
        id: 'new-reservation-id',
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: newReservation,
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: 'new-reservation-id',
        ...newReservation,
        userId: mockUser.id,
        status: 'pending',
      })
      
      expect(db.collection).toHaveBeenCalledWith('reservations')
      expect(db.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newReservation,
          userId: mockUser.id,
          status: 'pending',
        })
      )
    })

    it('should validate required fields', async () => {
      const token = await signJWT({ userId: mockUser.id })
      
      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: {
          date: '2024-01-20',
          // missing time and service
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should check slot availability', async () => {
      const token = await signJWT({ userId: mockUser.id })
      const { db } = require('@/lib/firebase/config')
      
      // Mock existing reservation at same time
      db.collection().where().get.mockResolvedValue({
        docs: [{ id: 'existing', data: () => ({ time: '14:00' }) }],
      })

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: {
          date: '2024-01-20',
          time: '14:00',
          service: 'カット',
        },
      })

      const response = await createReservationHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('This time slot is already booked')
    })
  })

  describe('GET /api/reservations/slots', () => {
    it('should get available slots for a date', async () => {
      const { db } = require('@/lib/firebase/config')
      
      // Mock some existing reservations
      db.collection().where().get.mockResolvedValue({
        docs: [
          { id: '1', data: () => ({ time: '10:00' }) },
          { id: '2', data: () => ({ time: '14:00' }) },
        ],
      })

      const { req } = createMocks({
        method: 'GET',
        query: {
          date: '2024-01-20',
        },
      })

      const response = await getSlotsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toBeInstanceOf(Array)
      
      // Check that occupied slots are marked as unavailable
      const slot10 = data.find((s: any) => s.time === '10:00')
      const slot11 = data.find((s: any) => s.time === '11:00')
      
      expect(slot10.available).toBe(false)
      expect(slot11.available).toBe(true)
    })

    it('should validate date parameter', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {
          // missing date
        },
      })

      const response = await getSlotsHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Date parameter is required')
    })
  })
})