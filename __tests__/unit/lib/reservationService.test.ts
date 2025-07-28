import {
  isTimeSlotAvailable,
  generateTimeSlots,
  validateReservationData,
} from '@/lib/reservationService'
import { createMockReservation, createMockTimeSlot } from '@/test/utils/mockData'

describe('reservationService', () => {
  describe('isTimeSlotAvailable', () => {
    it('should return true for available time slot', () => {
      const existingReservations = [
        createMockReservation({ date: '2024-01-15', time: '10:00' }),
        createMockReservation({ date: '2024-01-15', time: '14:00' }),
      ]

      expect(isTimeSlotAvailable('2024-01-15', '12:00', existingReservations)).toBe(true)
    })

    it('should return false for occupied time slot', () => {
      const existingReservations = [createMockReservation({ date: '2024-01-15', time: '10:00' })]

      expect(isTimeSlotAvailable('2024-01-15', '10:00', existingReservations)).toBe(false)
    })

    it('should handle empty reservations array', () => {
      expect(isTimeSlotAvailable('2024-01-15', '10:00', [])).toBe(true)
    })
  })

  describe('generateTimeSlots', () => {
    it('should generate time slots for a given date', () => {
      const date = '2024-01-15'
      const slots = generateTimeSlots(date)

      expect(slots).toHaveLength(8) // 10:00-17:00
      expect(slots[0]).toMatchObject({
        date: '2024-01-15',
        time: '10:00',
      })
      expect(slots[slots.length - 1]).toMatchObject({
        time: '17:00',
      })
    })

    it('should mark occupied slots as unavailable', () => {
      const date = '2024-01-15'
      const existingReservations = [createMockReservation({ date: '2024-01-15', time: '10:00' })]
      const slots = generateTimeSlots(date, existingReservations)

      const occupiedSlot = slots.find((s) => s.time === '10:00')
      expect(occupiedSlot?.available).toBe(false)

      const availableSlot = slots.find((s) => s.time === '11:00')
      expect(availableSlot?.available).toBe(true)
    })
  })

  describe('validateReservationData', () => {
    it('should validate correct reservation data', () => {
      const validData = {
        date: '2024-01-15',
        time: '10:00',
        service: 'カット',
        userId: 'user123',
      }

      const result = validateReservationData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should invalidate past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const invalidData = {
        date: pastDate.toISOString().split('T')[0],
        time: '10:00',
        service: 'カット',
        userId: 'user123',
      }

      const result = validateReservationData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('予約日は今日以降の日付を選択してください')
    })

    it('should invalidate invalid time format', () => {
      const invalidData = {
        date: '2024-01-15',
        time: '25:00',
        service: 'カット',
        userId: 'user123',
      }

      const result = validateReservationData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('無効な時間形式です')
    })

    it('should invalidate missing required fields', () => {
      const invalidData = {
        date: '2024-01-15',
        time: '',
        service: '',
        userId: 'user123',
      }

      const result = validateReservationData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('時間を選択してください')
      expect(result.errors).toContain('サービスを選択してください')
    })
  })
})
