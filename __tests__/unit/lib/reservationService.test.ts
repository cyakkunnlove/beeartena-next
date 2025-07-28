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

// Mock the firebase reservation service
jest.mock('@/lib/firebase/reservations', () => ({
  reservationService: {
    getReservationsByDate: jest.fn(),
  },
}))

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

// Import after mocking
import { reservationService } from '@/lib/reservationService'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'

describe('reservationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    // Mock current date to ensure test dates are in the future
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-07-01'))
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getTimeSlotsForDate', () => {
    it('should return available time slots for a weekday (Mon/Tue/Thu/Fri/Sat)', async () => {
      const mockDate = '2025-08-01' // Friday
      const mockReservations = [{ time: '18:30', status: 'confirmed' }]

      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(mockReservations)

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(2) // 18:30 and 19:30 for weekdays
      expect(slots[0]).toEqual({ 
        time: '18:30', 
        available: false, // Booked
        date: mockDate,
        maxCapacity: 1,
        currentBookings: 1
      })
      expect(slots[1]).toEqual({ 
        time: '19:30', 
        available: true,
        date: mockDate,
        maxCapacity: 1,
        currentBookings: 0
      })
    })

    it('should return available time slots for Wednesday', async () => {
      const mockDate = '2025-08-06' // Wednesday
      const mockReservations = [{ time: '11:00', status: 'confirmed' }]

      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(mockReservations)

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(4) // 9:00, 11:00, 13:00, 15:00 (2-hour slots)
      expect(slots[0]).toEqual({ 
        time: '9:00', 
        available: true,
        date: mockDate,
        maxCapacity: 1,
        currentBookings: 0
      })
      expect(slots[1]).toEqual({ 
        time: '11:00', 
        available: false, // Booked
        date: mockDate,
        maxCapacity: 1,
        currentBookings: 1
      })
    })

    it('should return all slots as available when no reservations exist', async () => {
      const mockDate = '2025-08-01' // Friday
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(2) // 18:30 and 19:30 for weekdays
      expect(slots.every((slot) => slot.available)).toBe(true)
    })

    it('should return empty array for Sunday (closed)', async () => {
      const sundayDate = '2025-08-03' // Sunday
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const slots = await reservationService.getTimeSlotsForDate(sundayDate)

      expect(slots).toHaveLength(0) // Closed on Sunday
    })

    it('should handle blocked dates', async () => {
      const blockedDate = '2025-08-01'
      // Add the date to blocked dates
      const settings = reservationService.getSettings()
      settings.blockedDates = [blockedDate]
      reservationService.saveSettings(settings)
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const slots = await reservationService.getTimeSlotsForDate(blockedDate)

      expect(slots).toHaveLength(0) // No slots for blocked dates
    })

    it.skip('should handle multiple bookings at same time when capacity allows', async () => {
      const mockDate = '2025-08-01'
      const mockReservations = [
        { time: '18:30', status: 'confirmed' },
        { time: '18:30', status: 'pending' }
      ]
      
      // Update settings to allow 3 bookings per slot
      const settings = reservationService.getSettings()
      settings.maxCapacityPerSlot = 3
      reservationService.saveSettings(settings)

      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(mockReservations)

      const slots = await reservationService.getTimeSlotsForDate(mockDate)

      expect(slots).toHaveLength(2) // Friday has 2 slots
      expect(slots[0].currentBookings).toBe(2)
      expect(slots[0].available).toBe(true) // Still available (2 < 3)
      
      // Reset settings
      settings.maxCapacityPerSlot = 1
      reservationService.saveSettings(settings)
    })
  })

  describe('isDateAvailable', () => {
    it.skip('should return true when date has available slots', async () => {
      const mockDate = '2025-08-01' // Friday
      
      // Mock the getReservationsByDate to return an empty array (all slots available)
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const isAvailable = await reservationService.isDateAvailable(mockDate)

      expect(isAvailable).toBe(true)
    })

    it('should return false when all slots are booked', async () => {
      const mockDate = '2025-08-01' // Friday
      const mockReservations = [
        { time: '18:30', status: 'confirmed' },
        { time: '19:30', status: 'confirmed' }
      ]
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(mockReservations)

      const isAvailable = await reservationService.isDateAvailable(mockDate)

      expect(isAvailable).toBe(false)
    })

    it('should return false for closed days', async () => {
      const sundayDate = '2025-08-03' // Sunday
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const isAvailable = await reservationService.isDateAvailable(sundayDate)

      expect(isAvailable).toBe(false) // Sunday is closed
    })
  })

  describe('getMonthAvailability', () => {
    it.skip('should return availability map for entire month', async () => {
      // Mock that only the 1st (Friday) has one available slot
      ;(firebaseReservationService.getReservationsByDate as jest.Mock)
        .mockImplementation((date: Date) => {
          const dateStr = date.toISOString().split('T')[0]
          if (dateStr === '2025-08-01') {
            return Promise.resolve([{ time: '18:30', status: 'confirmed' }])
          }
          return Promise.resolve([])
        })

      const availability = await reservationService.getMonthAvailability(2025, 7) // August (0-indexed)

      expect(availability.size).toBe(31) // August has 31 days
      expect(availability.get('2025-08-01')).toBe(true) // Friday with one slot booked
      expect(availability.get('2025-08-03')).toBe(false) // Sunday (closed)
    })

    it('should mark past dates as unavailable', async () => {
      // Reset timer and mock current date to be August 15, 2025
      jest.useRealTimers()
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-08-15'))
      
      ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

      const availability = await reservationService.getMonthAvailability(2025, 7)

      expect(availability.get('2025-08-14')).toBe(false) // Past date
      expect(availability.get('2025-08-15')).toBe(true) // Current date (if not Sunday)
      expect(availability.get('2025-08-16')).toBe(true) // Future date (Saturday)
    })
  })

  describe('getCalendarEvents', () => {
    it('should convert reservations to calendar event format', () => {
      const mockReservations = [
        {
          id: '1',
          date: '2025-08-01',
          time: '18:30',
          serviceName: 'カット',
          customerName: '山田太郎',
          status: 'confirmed' as const,
        },
      ]

      const events = reservationService.getCalendarEvents(mockReservations as any)

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        id: '1',
        title: 'カット - 山田太郎',
        allDay: false,
        status: 'confirmed',
      })
      
      // Check that event has 2-hour duration
      const start = events[0].start
      const end = events[0].end
      expect(end.getHours() - start.getHours()).toBe(2)
    })
  })
})
