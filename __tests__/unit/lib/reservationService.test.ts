import { reservationService } from '@/lib/reservationService'
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/firebase/config', () => ({
  db: {},
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}))

describe('reservationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTimeSlotsForDate', () => {
    it('should return available time slots for a given date', async () => {
      const mockDate = '2025-08-01'
      const mockReservations = [
        { time: '10:00' },
        { time: '14:00' },
      ]

      const mockQuerySnapshot = {
        docs: mockReservations.map((res) => ({
          data: () => res,
        })),
      }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)
      ;(query as jest.Mock).mockReturnValue('mock-query')
      ;(where as jest.Mock).mockReturnValue('mock-where')
      ;(collection as jest.Mock).mockReturnValue('mock-collection')

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(8) // 10:00-17:00 = 8 slots
      expect(slots[0]).toEqual({ time: '10:00', available: false }) // Booked
      expect(slots[1]).toEqual({ time: '11:00', available: true })
      expect(slots[4]).toEqual({ time: '14:00', available: false }) // Booked
      expect(slots[7]).toEqual({ time: '17:00', available: true })
    })

    it('should return all slots as available when no reservations exist', async () => {
      const mockDate = '2025-08-01'
      const mockQuerySnapshot = { docs: [] }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(8)
      expect(slots.every((slot) => slot.available)).toBe(true)
    })

    it('should handle past dates correctly', async () => {
      const pastDate = '2020-01-01'
      const mockQuerySnapshot = { docs: [] }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const slots = await reservationService.getTimeSlotsForDate(pastDate)

      expect(slots).toHaveLength(8)
      // All slots should be returned even for past dates
      // The UI should handle disabling past dates
    })

    it('should handle invalid date format gracefully', async () => {
      const invalidDate = 'invalid-date'
      const mockQuerySnapshot = { docs: [] }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const slots = await reservationService.getTimeSlotsForDate(invalidDate)

      // Should still return slots array
      expect(Array.isArray(slots)).toBe(true)
    })

    it('should filter only confirmed and pending reservations', async () => {
      const mockDate = '2025-08-01'

      ;(where as jest.Mock).mockImplementation((field, op, value) => {
        if (field === 'status' && op === 'in') {
          expect(value).toEqual(['confirmed', 'pending'])
        }
        return 'mock-where'
      })

      const mockQuerySnapshot = { docs: [] }
      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      await reservationService.getTimeSlotsForDate(mockDate)

      expect(where).toHaveBeenCalledWith('status', 'in', ['confirmed', 'pending'])
    })
  })

  describe('getDisabledDates', () => {
    it('should return dates that are fully booked', async () => {
      const mockReservations = [
        // 2025-08-01 has all 8 slots booked
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '10:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '11:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '12:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '13:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '14:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '15:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '16:00' },
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '17:00' },
        // 2025-08-02 has only 1 slot booked
        { date: Timestamp.fromDate(new Date('2025-08-02')), time: '10:00' },
      ]

      const mockQuerySnapshot = {
        docs: mockReservations.map((res) => ({
          data: () => res,
        })),
      }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const disabledDates = await reservationService.getDisabledDates()

      expect(disabledDates).toHaveLength(1)
      expect(disabledDates[0]).toBe('2025-08-01')
      expect(disabledDates).not.toContain('2025-08-02')
    })

    it('should return empty array when no dates are fully booked', async () => {
      const mockReservations = [
        { date: Timestamp.fromDate(new Date('2025-08-01')), time: '10:00' },
        { date: Timestamp.fromDate(new Date('2025-08-02')), time: '11:00' },
      ]

      const mockQuerySnapshot = {
        docs: mockReservations.map((res) => ({
          data: () => res,
        })),
      }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const disabledDates = await reservationService.getDisabledDates()

      expect(disabledDates).toHaveLength(0)
    })

    it('should handle empty reservations', async () => {
      const mockQuerySnapshot = { docs: [] }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const disabledDates = await reservationService.getDisabledDates()

      expect(disabledDates).toHaveLength(0)
    })

    it('should handle dates correctly across different timezones', async () => {
      const mockDate = new Date('2025-08-01T15:00:00Z') // UTC time
      const mockReservations = Array(8).fill(null).map((_, index) => ({
        date: Timestamp.fromDate(mockDate),
        time: `${10 + index}:00`,
      }))

      const mockQuerySnapshot = {
        docs: mockReservations.map((res) => ({
          data: () => res,
        })),
      }

      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const disabledDates = await reservationService.getDisabledDates()

      // Should return the date in local timezone format
      expect(disabledDates).toHaveLength(1)
      expect(disabledDates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('checkAvailability', () => {
    it('should return true when slot is available', async () => {
      const mockQuerySnapshot = { docs: [] }
      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const isAvailable = await reservationService.checkAvailability('2025-08-01', '10:00')

      expect(isAvailable).toBe(true)
    })

    it('should return false when slot is already booked', async () => {
      const mockQuerySnapshot = {
        docs: [{ data: () => ({ time: '10:00' }) }],
      }
      ;(getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot)

      const isAvailable = await reservationService.checkAvailability('2025-08-01', '10:00')

      expect(isAvailable).toBe(false)
    })
  })
})