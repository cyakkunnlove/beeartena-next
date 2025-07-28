import { pointService } from '@/lib/firebase/points'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'
import { userService } from '@/lib/firebase/users'
import { Reservation, TimeSlot, BusinessHours, ReservationSettings } from '@/lib/types'

// Test helper functions
export function isTimeSlotAvailable(
  date: string,
  time: string,
  existingReservations: Reservation[],
): boolean {
  return !existingReservations.some(
    (reservation) => reservation.date === date && reservation.time === time,
  )
}

export function generateTimeSlots(
  date: string,
  existingReservations: Reservation[] = [],
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startHour = 10
  const endHour = 17

  for (let hour = startHour; hour <= endHour; hour++) {
    const time = `${hour}:00`
    slots.push({
      date,
      time,
      available: isTimeSlotAvailable(date, time, existingReservations),
      maxCapacity: 1,
      currentBookings: existingReservations.filter((r) => r.date === date && r.time === time)
        .length,
    })
  }

  return slots
}

export function validateReservationData(data: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check required fields
  if (!data.date) {
    errors.push('日付を選択してください')
  } else {
    // Check if date is not in the past
    const selectedDate = new Date(data.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      errors.push('予約日は今日以降の日付を選択してください')
    }
  }

  if (!data.time) {
    errors.push('時間を選択してください')
  } else {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(data.time)) {
      errors.push('無効な時間形式です')
    }
  }

  if (!data.service) {
    errors.push('サービスを選択してください')
  }

  if (!data.userId) {
    errors.push('ユーザー情報が必要です')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

class ReservationService {
  private settings: ReservationSettings = {
    slotDuration: 120, // 2時間
    maxCapacityPerSlot: 1, // 1枠1人
    businessHours: [
      { dayOfWeek: 0, open: '', close: '', isOpen: false }, // 日曜休み
      { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true }, // 月曜
      { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true }, // 火曜
      { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true }, // 水曜
      { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true }, // 木曜
      { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true }, // 金曜
      { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true }, // 土曜
    ],
    blockedDates: [],
  }

  constructor() {
    // Load settings from localStorage if exists
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservationSettings')
      if (saved) {
        try {
          this.settings = JSON.parse(saved)
        } catch (error) {
          // If parsing fails, use default settings
          console.warn('Failed to parse reservation settings from localStorage:', error)
        }
      }
    }
  }

  saveSettings(settings: ReservationSettings): void {
    this.settings = settings
    if (typeof window !== 'undefined') {
      localStorage.setItem('reservationSettings', JSON.stringify(settings))
    }
  }

  getSettings(): ReservationSettings {
    return this.settings
  }

  // 予約作成
  async createReservation(
    reservation: Omit<Reservation, 'id' | 'createdAt'>,
  ): Promise<Reservation> {
    const newReservation = await firebaseReservationService.createReservation(reservation)

    // 予約完了時のポイント付与（予約金額の5%）
    if (reservation.price && reservation.customerId) {
      await pointService.addReservationPoints(reservation.customerId, reservation.price)
    }

    return newReservation
  }

  // 予約取得
  async getReservation(id: string): Promise<Reservation | null> {
    return firebaseReservationService.getReservation(id)
  }

  // ユーザーの予約一覧取得
  async getUserReservations(userId: string): Promise<Reservation[]> {
    return firebaseReservationService.getUserReservations(userId)
  }

  // 全予約取得（管理者用）
  async getAllReservations(): Promise<Reservation[]> {
    return firebaseReservationService.getAllReservations()
  }

  // 予約確定
  async confirmReservation(id: string): Promise<void> {
    await firebaseReservationService.updateReservationStatus(id, 'confirmed')
  }

  // 予約キャンセル
  async cancelReservation(id: string, reason?: string): Promise<void> {
    const reservation = await firebaseReservationService.getReservation(id)
    if (!reservation) {
      throw new Error('予約が見つかりません')
    }

    // キャンセル処理
    await firebaseReservationService.cancelReservation(id, reason)

    // ポイントの返却（予約確定済みの場合）
    if (reservation.status === 'confirmed' && reservation.price && reservation.customerId) {
      const pointAmount = Math.floor(reservation.price * 0.05)
      await pointService.usePoints(
        reservation.customerId,
        pointAmount,
        `予約キャンセルによるポイント返却（予約ID: ${id}）`,
      )
    }
  }

  // 予約完了処理
  async completeReservation(id: string): Promise<void> {
    const reservation = await firebaseReservationService.getReservation(id)
    if (!reservation) {
      throw new Error('予約が見つかりません')
    }

    await firebaseReservationService.updateReservationStatus(id, 'completed')

    // 累計利用金額を更新
    if (reservation.price && reservation.customerId) {
      await userService.updateTotalSpent(reservation.customerId, reservation.price)
    }
  }

  // 特定の日付の予約可能な時間枠を取得
  async getTimeSlotsForDate(date: string): Promise<TimeSlot[]> {
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    const businessHours = this.settings.businessHours[dayOfWeek]

    if (!businessHours.isOpen || this.settings.blockedDates?.includes(date)) {
      return []
    }

    const slots: TimeSlot[] = []
    const reservations = await firebaseReservationService.getReservationsByDate(dateObj)

    // 水曜日は時間枠が多い
    if (dayOfWeek === 3) {
      // 9:00-17:00の営業時間で2時間枠
      for (let hour = 9; hour < 17; hour += 2) {
        const timeStr = `${hour}:00`
        const bookingsAtTime = reservations.filter((r) => r.time === timeStr).length

        slots.push({
          time: timeStr,
          available: bookingsAtTime < this.settings.maxCapacityPerSlot,
          date: date,
          maxCapacity: this.settings.maxCapacityPerSlot,
          currentBookings: bookingsAtTime,
        })
      }
    } else if (businessHours.isOpen) {
      // その他の曜日は18:30と19:30のみ
      ;['18:30', '19:30'].forEach((time) => {
        const bookingsAtTime = reservations.filter((r) => r.time === time).length

        slots.push({
          time: time,
          available: bookingsAtTime < this.settings.maxCapacityPerSlot,
          date: date,
          maxCapacity: this.settings.maxCapacityPerSlot,
          currentBookings: bookingsAtTime,
        })
      })
    }

    return slots
  }

  // 特定の日付が予約可能かチェック
  async isDateAvailable(date: string): Promise<boolean> {
    const slots = await this.getTimeSlotsForDate(date)
    return slots.some((slot) => slot.available)
  }

  // 月の予約状況サマリーを取得
  async getMonthAvailability(year: number, month: number): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]

      // 過去の日付は予約不可
      if (date < new Date()) {
        availability.set(dateStr, false)
      } else {
        availability.set(dateStr, await this.isDateAvailable(dateStr))
      }
    }

    return availability
  }

  // 予約をカレンダーイベント形式に変換
  getCalendarEvents(reservations: Reservation[]): any[] {
    return reservations.map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 2) // 2時間の施術

      return {
        id: reservation.id,
        title: `${reservation.serviceName} - ${reservation.customerName}`,
        start: startDate,
        end: endDate,
        resource: reservation,
        allDay: false,
        status: reservation.status,
      }
    })
  }

  // iCalフォーマットでエクスポート
  exportToICal(reservations: Reservation[]): string {
    const events = reservations
      .filter((r) => r.status === 'confirmed' || r.status === 'completed')
      .map((reservation) => {
        const startDate = new Date(`${reservation.date}T${reservation.time}`)
        const endDate = new Date(startDate)
        endDate.setHours(startDate.getHours() + 2)

        const formatDate = (date: Date): string => {
          return date
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '')
        }

        return `BEGIN:VEVENT
UID:${reservation.id}@beeartena.jp
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${reservation.serviceName} - ${reservation.customerName}
DESCRIPTION:${reservation.serviceName}\\n顧客: ${reservation.customerName}\\n電話: ${reservation.customerPhone}\\n${reservation.notes || ''}
LOCATION:Bee Artena
STATUS:CONFIRMED
END:VEVENT`
      })
      .join('\n')

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bee Artena//Reservation System//JP
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Bee Artena 予約
X-WR-TIMEZONE:Asia/Tokyo
BEGIN:VTIMEZONE
TZID:Asia/Tokyo
TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Tokyo
X-LIC-LOCATION:Asia/Tokyo
BEGIN:STANDARD
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
TZNAME:JST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
${events}
END:VCALENDAR`
  }

  // 営業時間を更新
  updateBusinessHours(dayOfWeek: number, hours: Partial<BusinessHours>): void {
    if (this.settings.businessHours[dayOfWeek]) {
      this.settings.businessHours[dayOfWeek] = {
        ...this.settings.businessHours[dayOfWeek],
        ...hours,
      }
      this.saveSettings(this.settings)
    }
  }

  // ブロック日を追加/削除
  toggleBlockedDate(date: string): void {
    if (!this.settings.blockedDates) {
      this.settings.blockedDates = []
    }

    const index = this.settings.blockedDates.indexOf(date)
    if (index === -1) {
      this.settings.blockedDates.push(date)
    } else {
      this.settings.blockedDates.splice(index, 1)
    }

    this.saveSettings(this.settings)
  }
}

export const reservationService = new ReservationService()
