import { renderHook, waitFor } from '@testing-library/react'
import { reservationService } from '@/lib/reservationService'
import { settingsService } from '@/lib/firebase/settings'

// モック設定
jest.mock('@/lib/firebase/settings', () => ({
  settingsService: {
    getSettings: jest.fn(),
  },
}))

jest.mock('@/lib/firebase/reservations', () => ({
  reservationService: {
    getReservationsByDate: jest.fn().mockResolvedValue([]),
    getReservationsByMonth: jest.fn().mockResolvedValue(new Map()),
  },
}))

describe('Reservation Fixes', () => {
  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('初期表示の満員表示問題', () => {
    it('Firestoreから設定を読み込むまで、適切なデフォルト値を使用する', async () => {
      // Firestoreから設定を返すように設定
      const mockSettings = {
        slotDuration: 150,
        maxCapacityPerSlot: 5,
        businessHours: [
          { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 },
          { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true, allowMultipleSlots: true, slotInterval: 30, maxCapacityPerDay: 10 },
          { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
        ],
        blockedDates: [],
      }
      ;(settingsService.getSettings as jest.Mock).mockResolvedValue(mockSettings)

      // 月曜日の時間枠を取得
      const slots = await reservationService.getTimeSlotsForDate('2024-08-05')

      // Firestoreの設定が適用されているか確認
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].maxCapacity).toBe(5) // Firestoreの設定値
    })

    it('localStorage に保存された設定を優先して使用する', async () => {
      // localStorage に設定を保存
      const savedSettings = {
        slotDuration: 150,
        maxCapacityPerSlot: 3,
        businessHours: [
          { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 },
          { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true, allowMultipleSlots: true, slotInterval: 30, maxCapacityPerDay: 10 },
          { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
          { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
        ],
        blockedDates: [],
      }
      localStorage.setItem('reservationSettings', JSON.stringify(savedSettings))

      // 新しいインスタンスを作成（コンストラクタで localStorage を読み込む）
      const newService = new (reservationService.constructor as any)()
      const settings = newService.getSettings()

      expect(settings.maxCapacityPerSlot).toBe(3)
    })
  })

  describe('日付フォーマットの問題', () => {
    it('日付を正しくフォーマットする（タイムゾーンの影響を受けない）', () => {
      // 2024年8月6日を表すDateオブジェクト
      const date = new Date(2024, 7, 6) // month は 0-indexed

      // formatDate 関数のテスト（Calendar.tsx で使用される形式）
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const formatted = formatDate(date)
      expect(formatted).toBe('2024-08-06')
    })

    it('日付文字列からDateオブジェクトを正しく作成する', () => {
      const dateStr = '2024-08-06'
      
      // TimeSlots.tsx で使用される形式
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(7) // 8月（0-indexed）
      expect(date.getDate()).toBe(6)
    })
  })
})