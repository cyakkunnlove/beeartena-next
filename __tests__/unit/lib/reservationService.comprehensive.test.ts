import {
  reservationService,
  validateReservationData,
  isTimeSlotAvailable,
  generateTimeSlots,
} from '@/lib/reservationService'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'
import { pointService } from '@/lib/firebase/points'
import { userService } from '@/lib/firebase/users'
import { Reservation, ReservationSettings } from '@/lib/types'

// Mock dependencies
jest.mock('@/lib/firebase/reservations')
jest.mock('@/lib/firebase/points')
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

describe('ReservationService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-07-01T10:00:00'))
    
    // Reset to default settings since we clear localStorage
    const settings = reservationService.getSettings()
    reservationService.saveSettings(settings)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Helper Functions', () => {
    describe('isTimeSlotAvailable', () => {
      it('should return true when time slot is available', () => {
        const existingReservations: Reservation[] = [
          { date: '2025-08-01', time: '10:00' } as Reservation,
        ]

        expect(isTimeSlotAvailable('2025-08-01', '11:00', existingReservations)).toBe(true)
      })

      it('should return false when time slot is taken', () => {
        const existingReservations: Reservation[] = [
          { date: '2025-08-01', time: '10:00' } as Reservation,
        ]

        expect(isTimeSlotAvailable('2025-08-01', '10:00', existingReservations)).toBe(false)
      })

      it('should handle empty reservations array', () => {
        expect(isTimeSlotAvailable('2025-08-01', '10:00', [])).toBe(true)
      })
    })

    describe('generateTimeSlots', () => {
      it('should generate time slots from 10:00 to 17:00', () => {
        const slots = generateTimeSlots('2025-08-01', [])

        expect(slots).toHaveLength(8)
        expect(slots[0].time).toBe('10:00')
        expect(slots[7].time).toBe('17:00')
        expect(slots.every((slot) => slot.available)).toBe(true)
      })

      it('should mark slots as unavailable when booked', () => {
        const existingReservations: Reservation[] = [
          { date: '2025-08-01', time: '10:00' } as Reservation,
          { date: '2025-08-01', time: '14:00' } as Reservation,
        ]

        const slots = generateTimeSlots('2025-08-01', existingReservations)

        expect(slots[0].available).toBe(false) // 10:00
        expect(slots[4].available).toBe(false) // 14:00
        expect(slots[1].available).toBe(true) // 11:00
      })

      it('should calculate current bookings correctly', () => {
        const existingReservations: Reservation[] = [
          { date: '2025-08-01', time: '10:00' } as Reservation,
          { date: '2025-08-01', time: '10:00' } as Reservation,
        ]

        const slots = generateTimeSlots('2025-08-01', existingReservations)

        expect(slots[0].currentBookings).toBe(2)
      })
    })

    describe('validateReservationData', () => {
      const validData = {
        date: '2025-08-01',
        time: '10:00',
        service: 'カット',
        userId: 'user123',
      }

      it('should validate correct reservation data', () => {
        const result = validateReservationData(validData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject missing date', () => {
        const data = { ...validData, date: '' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('日付を選択してください')
      })

      it('should reject past dates', () => {
        const data = { ...validData, date: '2025-06-30' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('予約日は今日以降の日付を選択してください')
      })

      it('should accept today as valid date', () => {
        const data = { ...validData, date: '2025-07-01' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(true)
      })

      it('should reject missing time', () => {
        const data = { ...validData, time: '' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('時間を選択してください')
      })

      it('should reject invalid time format', () => {
        const invalidTimes = ['25:00', '10:60', '10', '10:0', 'abc', '10:00:00']

        invalidTimes.forEach((time) => {
          const data = { ...validData, time }
          const result = validateReservationData(data)

          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('無効な時間形式です')
        })
      })

      it('should accept valid time formats', () => {
        const validTimes = ['10:00', '09:30', '23:59', '0:00', '00:00']

        validTimes.forEach((time) => {
          const data = { ...validData, time }
          const result = validateReservationData(data)

          expect(result.isValid).toBe(true)
        })
      })

      it('should reject missing service', () => {
        const data = { ...validData, service: '' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('サービスを選択してください')
      })

      it('should reject missing userId', () => {
        const data = { ...validData, userId: '' }
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('ユーザー情報が必要です')
      })

      it('should collect multiple errors', () => {
        const data = {}
        const result = validateReservationData(data)

        expect(result.isValid).toBe(false)
        expect(result.errors).toHaveLength(4)
      })
    })
  })

  describe('Settings Management', () => {
    it('should initialize with default settings', () => {
      const settings = reservationService.getSettings()

      expect(settings.slotDuration).toBe(120)
      expect(settings.maxCapacityPerSlot).toBe(1)
      expect(settings.businessHours).toHaveLength(7)
      expect(settings.blockedDates).toEqual([])
    })

    it('should save and retrieve settings from localStorage', () => {
      const customSettings: ReservationSettings = {
        slotDuration: 90,
        maxCapacityPerSlot: 2,
        businessHours: reservationService.getSettings().businessHours,
        blockedDates: ['2025-08-15'],
      }

      reservationService.saveSettings(customSettings)

      // Create new instance to test persistence
      const newService = new (reservationService.constructor as any)()
      const retrievedSettings = newService.getSettings()

      expect(retrievedSettings.slotDuration).toBe(90)
      expect(retrievedSettings.maxCapacityPerSlot).toBe(2)
      expect(retrievedSettings.blockedDates).toContain('2025-08-15')
    })

    it('should update business hours for specific day', () => {
      reservationService.updateBusinessHours(1, {
        open: '10:00',
        close: '18:00',
        isOpen: true,
      })

      const settings = reservationService.getSettings()
      const mondayHours = settings.businessHours[1]

      expect(mondayHours.open).toBe('10:00')
      expect(mondayHours.close).toBe('18:00')
      expect(mondayHours.isOpen).toBe(true)
    })

    it('should handle invalid day of week gracefully', () => {
      expect(() => {
        reservationService.updateBusinessHours(7, { open: '10:00' })
      }).not.toThrow()
    })

    it('should toggle blocked dates', () => {
      const date = '2025-08-15'
      
      // Clear any existing blocked dates
      const settings = reservationService.getSettings()
      settings.blockedDates = []
      reservationService.saveSettings(settings)

      // Add blocked date
      reservationService.toggleBlockedDate(date)
      expect(reservationService.getSettings().blockedDates).toContain(date)

      // Remove blocked date
      reservationService.toggleBlockedDate(date)
      expect(reservationService.getSettings().blockedDates).not.toContain(date)
    })

    it('should handle toggling blocked dates when array is undefined', () => {
      const settings = reservationService.getSettings()
      delete settings.blockedDates
      reservationService.saveSettings(settings)

      reservationService.toggleBlockedDate('2025-08-15')
      expect(reservationService.getSettings().blockedDates).toContain('2025-08-15')
    })
  })

  describe('Reservation CRUD Operations', () => {
    describe('createReservation', () => {
      const mockReservation: Omit<Reservation, 'id' | 'createdAt'> = {
        customerId: 'customer123',
        customerName: '山田太郎',
        customerEmail: 'yamada@example.com',
        customerPhone: '090-1234-5678',
        serviceType: '2D',
        serviceName: 'カット',
        price: 5000,
        date: '2025-08-01',
        time: '10:00',
        status: 'pending',
        updatedAt: new Date(),
      }

      it('should create reservation and add points', async () => {
        const createdReservation = { ...mockReservation, id: 'res123', createdAt: new Date() }
        ;(firebaseReservationService.createReservation as jest.Mock).mockResolvedValue(
          createdReservation,
        )

        const result = await reservationService.createReservation(mockReservation)

        expect(firebaseReservationService.createReservation).toHaveBeenCalledWith(mockReservation)
        expect(pointService.addReservationPoints).toHaveBeenCalledWith('customer123', 5000)
        expect(result).toEqual(createdReservation)
      })

      it('should create reservation without points if no price', async () => {
        const reservationWithoutPrice = { ...mockReservation, price: 0 }
        const createdReservation = {
          ...reservationWithoutPrice,
          id: 'res123',
          createdAt: new Date(),
        }
        ;(firebaseReservationService.createReservation as jest.Mock).mockResolvedValue(
          createdReservation,
        )

        await reservationService.createReservation(reservationWithoutPrice)

        expect(pointService.addReservationPoints).not.toHaveBeenCalled()
      })

      it('should create reservation without points if no customerId', async () => {
        const reservationWithoutCustomer = { ...mockReservation, customerId: null }
        const createdReservation = {
          ...reservationWithoutCustomer,
          id: 'res123',
          createdAt: new Date(),
        }
        ;(firebaseReservationService.createReservation as jest.Mock).mockResolvedValue(
          createdReservation,
        )

        await reservationService.createReservation(reservationWithoutCustomer)

        expect(pointService.addReservationPoints).not.toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        ;(firebaseReservationService.createReservation as jest.Mock).mockRejectedValue(
          new Error('Creation failed'),
        )

        await expect(reservationService.createReservation(mockReservation)).rejects.toThrow(
          'Creation failed',
        )
      })
    })

    describe('getReservation', () => {
      it('should get reservation by id', async () => {
        const mockReservation = { id: 'res123' } as Reservation
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

        const result = await reservationService.getReservation('res123')

        expect(firebaseReservationService.getReservation).toHaveBeenCalledWith('res123')
        expect(result).toEqual(mockReservation)
      })

      it('should return null for non-existent reservation', async () => {
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(null)

        const result = await reservationService.getReservation('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('cancelReservation', () => {
      it('should cancel reservation and return points for confirmed reservations', async () => {
        const mockReservation = {
          id: 'res123',
          status: 'confirmed',
          price: 5000,
          customerId: 'customer123',
        } as Reservation
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

        await reservationService.cancelReservation('res123', 'Customer request')

        expect(firebaseReservationService.cancelReservation).toHaveBeenCalledWith(
          'res123',
          'Customer request',
        )
        expect(pointService.usePoints).toHaveBeenCalledWith(
          'customer123',
          250, // 5% of 5000
          '予約キャンセルによるポイント返却（予約ID: res123）',
        )
      })

      it('should not return points for pending reservations', async () => {
        const mockReservation = {
          id: 'res123',
          status: 'pending',
          price: 5000,
          customerId: 'customer123',
        } as Reservation
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

        await reservationService.cancelReservation('res123')

        expect(firebaseReservationService.cancelReservation).toHaveBeenCalledWith(
          'res123',
          undefined,
        )
        expect(pointService.usePoints).not.toHaveBeenCalled()
      })

      it('should throw error if reservation not found', async () => {
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(null)

        await expect(reservationService.cancelReservation('nonexistent')).rejects.toThrow(
          '予約が見つかりません',
        )
      })
    })

    describe('completeReservation', () => {
      it('should complete reservation and update total spent', async () => {
        const mockReservation = {
          id: 'res123',
          price: 5000,
          customerId: 'customer123',
        } as Reservation
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

        await reservationService.completeReservation('res123')

        expect(firebaseReservationService.updateReservationStatus).toHaveBeenCalledWith(
          'res123',
          'completed',
        )
        expect(userService.updateTotalSpent).toHaveBeenCalledWith('customer123', 5000)
      })

      it('should complete reservation without updating total if no price', async () => {
        const mockReservation = {
          id: 'res123',
          price: 0,
          customerId: 'customer123',
        } as Reservation
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(mockReservation)

        await reservationService.completeReservation('res123')

        expect(userService.updateTotalSpent).not.toHaveBeenCalled()
      })

      it('should throw error if reservation not found', async () => {
        ;(firebaseReservationService.getReservation as jest.Mock).mockResolvedValue(null)

        await expect(reservationService.completeReservation('nonexistent')).rejects.toThrow(
          '予約が見つかりません',
        )
      })
    })
  })

  describe('Time Slot Management', () => {
    describe('getTimeSlotsForDate', () => {
      beforeEach(() => {
        // Reset settings to default before each test
        const defaultSettings = {
          slotDuration: 120,
          maxCapacityPerSlot: 1,
          businessHours: [
            { dayOfWeek: 0, open: '', close: '', isOpen: false },
            { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true },
            { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true },
            { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true },
            { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true },
            { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true },
            { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true },
          ],
          blockedDates: [],
        }
        reservationService.saveSettings(defaultSettings)
      })

      it('should return empty array for Sunday (closed)', async () => {
        const sundayDate = '2025-08-03'
        ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

        const slots = await reservationService.getTimeSlotsForDate(sundayDate)

        expect(slots).toHaveLength(0)
      })

      it('should return empty array for blocked dates', async () => {
        const blockedDate = '2025-08-01'
        const settings = reservationService.getSettings()
        settings.blockedDates = [blockedDate]
        reservationService.saveSettings(settings)

        const slots = await reservationService.getTimeSlotsForDate(blockedDate)

        expect(slots).toHaveLength(0)
      })

      it('should return 2-hour slots for Wednesday (9:00-17:00)', async () => {
        const wednesdayDate = '2025-08-06'
        ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

        const slots = await reservationService.getTimeSlotsForDate(wednesdayDate)

        expect(slots).toHaveLength(4)
        expect(slots.map((s) => s.time)).toEqual(['9:00', '11:00', '13:00', '15:00'])
        expect(slots.every((s) => s.available)).toBe(true)
      })

      it('should return evening slots for weekdays', async () => {
        const fridayDate = '2025-08-01'
        ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

        const slots = await reservationService.getTimeSlotsForDate(fridayDate)

        expect(slots).toHaveLength(2)
        expect(slots.map((s) => s.time)).toEqual(['18:30', '19:30'])
      })

      it('should handle multiple bookings at same time', async () => {
        const date = '2025-08-01'
        const mockReservations = [
          { time: '18:30', status: 'confirmed' },
          { time: '18:30', status: 'pending' },
        ]
        ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue(
          mockReservations,
        )

        // Update capacity to allow multiple bookings
        const settings = reservationService.getSettings()
        settings.maxCapacityPerSlot = 3
        reservationService.saveSettings(settings)

        const slots = await reservationService.getTimeSlotsForDate(date)

        expect(slots).toHaveLength(2) // Should have evening slots
        expect(slots[0].currentBookings).toBe(2)
        expect(slots[0].available).toBe(true) // Still has capacity
        expect(slots[0].maxCapacity).toBe(3)
      })
    })

    describe('isDateAvailable', () => {
      it('should return true if any slot is available', async () => {
        jest.spyOn(reservationService, 'getTimeSlotsForDate').mockResolvedValue([
          { time: '18:30', available: false, date: '2025-08-01' },
          { time: '19:30', available: true, date: '2025-08-01' },
        ])

        const result = await reservationService.isDateAvailable('2025-08-01')

        expect(result).toBe(true)
      })

      it('should return false if no slots are available', async () => {
        jest.spyOn(reservationService, 'getTimeSlotsForDate').mockResolvedValue([
          { time: '18:30', available: false, date: '2025-08-01' },
          { time: '19:30', available: false, date: '2025-08-01' },
        ])

        const result = await reservationService.isDateAvailable('2025-08-01')

        expect(result).toBe(false)
      })

      it('should return false for dates with no slots', async () => {
        jest.spyOn(reservationService, 'getTimeSlotsForDate').mockResolvedValue([])

        const result = await reservationService.isDateAvailable('2025-08-03')

        expect(result).toBe(false)
      })
    })

    describe('getMonthAvailability', () => {
      it('should return availability for all days in month', async () => {
        jest
          .spyOn(reservationService, 'isDateAvailable')
          .mockImplementation(async (date) => !date.endsWith('03')) // Sundays are unavailable

        const availability = await reservationService.getMonthAvailability(2025, 7) // August

        expect(availability.size).toBe(31)
        expect(availability.get('2025-08-03')).toBe(false) // Sunday
        expect(availability.get('2025-08-01')).toBe(true) // Friday
      })

      it('should mark past dates as unavailable', async () => {
        jest.useRealTimers()
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2025-08-15T10:00:00'))

        jest.spyOn(reservationService, 'isDateAvailable').mockResolvedValue(true)

        const availability = await reservationService.getMonthAvailability(2025, 7)

        expect(availability.get('2025-08-14')).toBe(false) // Past
        expect(availability.get('2025-08-15')).toBe(true) // Today
        expect(availability.get('2025-08-16')).toBe(true) // Future
      })
    })
  })

  describe('Calendar Integration', () => {
    describe('getCalendarEvents', () => {
      it('should convert reservations to calendar events', () => {
        const mockReservations: Reservation[] = [
          {
            id: 'res1',
            date: '2025-08-01',
            time: '18:30',
            serviceName: 'カット',
            customerName: '山田太郎',
            status: 'confirmed',
          } as Reservation,
          {
            id: 'res2',
            date: '2025-08-02',
            time: '10:00',
            serviceName: 'カラー',
            customerName: '鈴木花子',
            status: 'pending',
          } as Reservation,
        ]

        const events = reservationService.getCalendarEvents(mockReservations)

        expect(events).toHaveLength(2)
        expect(events[0]).toMatchObject({
          id: 'res1',
          title: 'カット - 山田太郎',
          allDay: false,
          status: 'confirmed',
        })

        // Check 2-hour duration
        const start1 = events[0].start
        const end1 = events[0].end
        expect(end1.getTime() - start1.getTime()).toBe(2 * 60 * 60 * 1000)
      })

      it('should handle empty reservation list', () => {
        const events = reservationService.getCalendarEvents([])
        expect(events).toEqual([])
      })
    })

    describe('exportToICal', () => {
      it('should export confirmed and completed reservations to iCal format', () => {
        const mockReservations: Reservation[] = [
          {
            id: 'res1',
            date: '2025-08-01',
            time: '18:30',
            serviceName: 'カット',
            customerName: '山田太郎',
            customerPhone: '090-1234-5678',
            status: 'confirmed',
            notes: 'テストノート',
          } as Reservation,
          {
            id: 'res2',
            date: '2025-08-02',
            time: '10:00',
            serviceName: 'カラー',
            customerName: '鈴木花子',
            customerPhone: '090-8765-4321',
            status: 'pending', // Should be excluded
          } as Reservation,
        ]

        const ical = reservationService.exportToICal(mockReservations)

        expect(ical).toContain('BEGIN:VCALENDAR')
        expect(ical).toContain('END:VCALENDAR')
        expect(ical).toContain('UID:res1@beeartena.jp')
        expect(ical).toContain('SUMMARY:カット - 山田太郎')
        expect(ical).toContain('テストノート')
        expect(ical).not.toContain('UID:res2@beeartena.jp') // Pending should be excluded
      })

      it('should handle reservations without notes', () => {
        const mockReservations: Reservation[] = [
          {
            id: 'res1',
            date: '2025-08-01',
            time: '18:30',
            serviceName: 'カット',
            customerName: '山田太郎',
            customerPhone: '090-1234-5678',
            status: 'completed',
          } as Reservation,
        ]

        const ical = reservationService.exportToICal(mockReservations)

        expect(ical).toContain('DESCRIPTION:カット\\n顧客: 山田太郎\\n電話: 090-1234-5678\\n')
      })

      it('should include timezone information', () => {
        const ical = reservationService.exportToICal([])

        expect(ical).toContain('BEGIN:VTIMEZONE')
        expect(ical).toContain('TZID:Asia/Tokyo')
        expect(ical).toContain('END:VTIMEZONE')
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle Date object edge cases', async () => {
      // Test with DST transition dates, leap years, etc.
      const edgeDates = [
        '2025-02-29', // Invalid leap year
        '2025-12-31', // Year end
        '2025-01-01', // Year start
      ]

      for (const date of edgeDates) {
        ;(firebaseReservationService.getReservationsByDate as jest.Mock).mockResolvedValue([])

        // Should not throw
        await expect(reservationService.getTimeSlotsForDate(date)).resolves.toBeDefined()
      }
    })

    it('should handle concurrent modifications safely', async () => {
      const promises = []

      // Simulate multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        promises.push(reservationService.toggleBlockedDate(`2025-08-${i + 1}`))
      }

      await Promise.all(promises)

      const settings = reservationService.getSettings()
      expect(settings.blockedDates?.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle malformed localStorage data gracefully', () => {
      localStorageMock.setItem('reservationSettings', 'invalid json')

      // Mock console.warn to avoid test output
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Should not throw and use default settings
      const ReservationServiceClass = Object.getPrototypeOf(reservationService).constructor
      const newService = new ReservationServiceClass()
      const settings = newService.getSettings()

      expect(settings.slotDuration).toBe(120) // Default value
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse reservation settings from localStorage:',
        expect.any(SyntaxError),
      )

      consoleWarnSpy.mockRestore()
    })
  })
})
