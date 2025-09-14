import { pointService } from '@/lib/firebase/points'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'
import { userService } from '@/lib/firebase/users'
import { settingsService } from '@/lib/firebase/settings'
import { Reservation, TimeSlot, BusinessHours, ReservationSettings } from '@/lib/types'
import { emailService } from '@/lib/email/emailService'

// キャッシュ関連の型定義
interface CacheInterface {
  get<T = any>(key: string): Promise<T | null>
  set(key: string, data: any, ttl?: number, options?: any): Promise<void>
  delete(key: string): Promise<void>
  invalidateByTag(tag: string): Promise<void>
}

// ダミーキャッシュ（クライアントサイド用）
class DummyCache implements CacheInterface {
  async get<T = any>(_key: string): Promise<T | null> {
    return null
  }
  async set(_key: string, _data: any, _ttl?: number, _options?: any): Promise<void> {
    // 何もしない
  }
  async delete(_key: string): Promise<void> {
    // 何もしない
  }
  async invalidateByTag(_tag: string): Promise<void> {
    // 何もしない
  }
}

// サーバーサイドでのみ実際のキャッシュを使用
let cache: CacheInterface = new DummyCache()
let Cache: any = {
  generateKey: (...args: any[]) => args.join(':')
}

if (typeof window === 'undefined') {
  // サーバーサイドでのみキャッシュモジュールをインポート
  try {
    const cacheModule = require('@/lib/api/cache')
    cache = cacheModule.cache
    Cache = cacheModule.Cache
  } catch (error) {
    console.warn('Cache module not available:', error)
  }
}

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
    slotDuration: 150, // 2時間30分
    maxCapacityPerSlot: 10, // デフォルトを10に設定（Firestoreから読み込むまでの暫定値）
    businessHours: [
      { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 }, // 日曜休み
      { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 月曜
      { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 火曜
      { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true, allowMultipleSlots: true, slotInterval: 30, maxCapacityPerDay: 10 }, // 水曜（30分間隔で複数予約可）
      { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 木曜
      { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 金曜
      { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 土曜
    ],
    blockedDates: [],
    cancellationDeadlineHours: 24, // デフォルト24時間前
    cancellationPolicy: '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
  }
  private isSettingsLoaded = false
  private settingsLoadPromise: Promise<void> | null = null

  constructor() {
    // Load settings from localStorage if exists (for immediate use)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservationSettings')
      if (saved) {
        try {
          const savedSettings = JSON.parse(saved)
          
          // 営業時間の設定を修正（古い形式のデータを新しい形式に変換）
          const businessHours = savedSettings.businessHours.map((hours: any) => {
            // デフォルト設定から該当する曜日の設定を取得
            const defaultHours = this.settings.businessHours.find(h => h.dayOfWeek === hours.dayOfWeek)
            
            return {
              ...hours,
              // 複数枠設定が欠けている場合はデフォルト値を使用
              allowMultipleSlots: hours.allowMultipleSlots ?? defaultHours?.allowMultipleSlots,
              slotInterval: hours.slotInterval ?? defaultHours?.slotInterval,
              maxCapacityPerDay: hours.maxCapacityPerDay ?? defaultHours?.maxCapacityPerDay ?? 1,
            }
          })
          
          this.settings = {
            ...savedSettings,
            businessHours,
            // デフォルト値を設定
            cancellationDeadlineHours: savedSettings.cancellationDeadlineHours || 24,
            cancellationPolicy: savedSettings.cancellationPolicy || '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
          }
          this.isSettingsLoaded = true
        } catch (error) {
          // If parsing fails, use default settings
          console.warn('Failed to parse reservation settings from localStorage:', error)
        }
      }
    }
    
    // Firestoreから設定を非同期で読み込む
    this.settingsLoadPromise = this.loadSettingsFromFirestore()
  }
  
  private async loadSettingsFromFirestore(): Promise<void> {
    try {
      const firestoreSettings = await settingsService.getSettings()
      if (firestoreSettings) {
        // 営業時間の設定を修正（古い形式のデータを新しい形式に変換）
        const businessHours = firestoreSettings.businessHours.map(hours => {
          // デフォルト設定から該当する曜日の設定を取得
          const defaultHours = this.settings.businessHours.find(h => h.dayOfWeek === hours.dayOfWeek)
          
          return {
            ...hours,
            // 複数枠設定が欠けている場合はデフォルト値を使用
            allowMultipleSlots: hours.allowMultipleSlots ?? defaultHours?.allowMultipleSlots,
            slotInterval: hours.slotInterval ?? defaultHours?.slotInterval,
            maxCapacityPerDay: hours.maxCapacityPerDay ?? defaultHours?.maxCapacityPerDay ?? 1,
          }
        })
        
        this.settings = {
          ...firestoreSettings,
          businessHours,
          // デフォルト値を設定
          cancellationDeadlineHours: firestoreSettings.cancellationDeadlineHours || 24,
          cancellationPolicy: firestoreSettings.cancellationPolicy || '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
        }
        this.isSettingsLoaded = true
        // localStorageも更新
        if (typeof window !== 'undefined') {
          localStorage.setItem('reservationSettings', JSON.stringify(this.settings))
        }
      }
    } catch (error) {
      console.error('Firestoreから設定を読み込めませんでした:', error)
    }
  }

  // 設定が読み込まれるまで待つ
  async waitForSettings(): Promise<void> {
    if (this.isSettingsLoaded) return
    if (this.settingsLoadPromise) {
      await this.settingsLoadPromise
    }
  }

  async saveSettings(settings: ReservationSettings): Promise<void> {
    this.settings = settings
    
    // localStorageに即座に保存（UIの即時反映のため）
    if (typeof window !== 'undefined') {
      localStorage.setItem('reservationSettings', JSON.stringify(settings))
    }
    
    // Firestoreに保存
    try {
      await settingsService.saveSettings(settings)
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      throw error
    }
  }

  getSettings(): ReservationSettings {
    return this.settings
  }

  // 予約作成
  async createReservation(
    reservation: Omit<Reservation, 'id' | 'createdAt'>,
    createdBy?: string,
  ): Promise<Reservation> {
    const reservationData = {
      ...reservation,
      createdBy: createdBy || reservation.customerId || 'guest',
    }
    
    const newReservation = await firebaseReservationService.createReservation(reservationData)
    
    // メール送信処理（エラーが発生してもリザベーションは成功させる）
    try {
      // メールアドレスの取得（customerEmailが直接提供されている場合はそれを使用）
      let userEmail = newReservation.customerEmail
      
      // customerIdがある場合はユーザー情報から取得を試みる
      if (newReservation.customerId && newReservation.customerId !== 'guest') {
        try {
          const user = await userService.getUser(newReservation.customerId)
          if (user && user.email) {
            userEmail = user.email
          }
        } catch (userError) {
          console.log('ユーザー情報取得エラー（メールアドレスは予約データから使用）:', userError)
        }
      }
      
      if (userEmail) {
        // 顧客への確認メール
        await emailService.sendReservationConfirmation(newReservation, userEmail)
        // 管理者への通知メール
        await emailService.sendReservationNotificationToAdmin(newReservation)
      } else {
        console.log('メールアドレスが見つからないため、メール送信をスキップしました')
      }
    } catch (error) {
      console.error('メール送信エラー:', error)
      // メール送信に失敗してもリザベーションは成功とする
    }

    // キャッシュを無効化（サーバーサイドのみ）
    if (typeof window === 'undefined') {
      const reservationDate = new Date(newReservation.date)
      const year = reservationDate.getFullYear()
      const month = reservationDate.getMonth()
      
      // 関連するキャッシュを削除
      await Promise.all([
        cache.invalidateByTag(`month-${year}-${month}`),
        cache.invalidateByTag(`date-${newReservation.date}`),
        cache.delete(Cache.generateKey('time-slots', newReservation.date)),
        cache.delete(Cache.generateKey('month-availability', year, month)),
      ])
    }

    // 予約完了時のポイント付与（予約金額の5%）
    if (reservation.price && reservation.customerId) {
      await pointService.addReservationPoints(reservation.customerId, reservation.price)
    }

    // メール通知を送信
    try {
      // ユーザーへの確認メール
      if (reservation.customerEmail) {
        await emailService.sendReservationConfirmation(newReservation, reservation.customerEmail)
      }
      // 管理者への通知メール
      await emailService.sendReservationNotificationToAdmin(newReservation)
    } catch (error) {
      console.error('メール送信エラー:', error)
      // メール送信に失敗しても予約自体は成功とする
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

    // キャンセル通知メールを送信
    try {
      // キャンセル理由を含めた予約情報
      const cancelledReservation = { ...reservation, cancelReason: reason }
      
      // ユーザーへの確認メール
      if (reservation.customerEmail) {
        await emailService.sendCancellationConfirmation(cancelledReservation, reservation.customerEmail)
      }
      // 管理者への通知メール
      await emailService.sendCancellationNotificationToAdmin(cancelledReservation)
    } catch (error) {
      console.error('キャンセルメール送信エラー:', error)
    }
  }

  // 予約完了処理
  async completeReservation(id: string, completedBy?: string): Promise<void> {
    const reservation = await firebaseReservationService.getReservation(id)
    if (!reservation) {
      throw new Error('予約が見つかりません')
    }

    await firebaseReservationService.updateReservationStatus(id, 'completed', completedBy)

    // 累計利用金額を更新
    if (reservation.price && reservation.customerId) {
      await userService.updateTotalSpent(reservation.customerId, reservation.price)
    }
  }

  // 特定の日付の予約可能な時間枠を取得
  async getTimeSlotsForDate(date: string): Promise<TimeSlot[]> {
    // 設定が読み込まれるまで待つ
    await this.waitForSettings()
    // キャッシュから取得を試みる（サーバーサイドのみ）
    if (typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('time-slots', date)
      const cached = await cache.get<TimeSlot[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 日付文字列をローカルタイムで正確に解釈
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay()
    const businessHours = this.settings.businessHours[dayOfWeek]

    if (!businessHours.isOpen || this.settings.blockedDates?.includes(date)) {
      return []
    }

    const slots: TimeSlot[] = []
    const reservations = await firebaseReservationService.getReservationsByDate(dateObj)
    
    // その日の最大受付人数を取得
    const maxCapacityPerDay = businessHours.maxCapacityPerDay || 1

    // 営業時間から時間枠を生成
    const [openHour, openMinute] = businessHours.open.split(':').map(Number)
    const [closeHour, closeMinute] = businessHours.close.split(':').map(Number)
    
    // 開始時刻と終了時刻を分単位に変換
    const openTimeInMinutes = openHour * 60 + openMinute
    const closeTimeInMinutes = closeHour * 60 + closeMinute
    
    // スロット時間（デフォルト120分）
    const slotDuration = this.settings.slotDuration || 120
    
    // その日の合計予約数をチェック
    const totalReservationsForDay = reservations.length
    const isDayFullyBooked = totalReservationsForDay >= maxCapacityPerDay
    
    // 複数予約が許可されている曜日は指定された間隔で時間枠を生成
    if (businessHours.allowMultipleSlots) {
      // 設定されたスロット間隔を使用（デフォルト30分）
      const interval = businessHours.slotInterval || 30
      for (let currentMinutes = openTimeInMinutes; currentMinutes <= closeTimeInMinutes - slotDuration; currentMinutes += interval) {
        const hour = Math.floor(currentMinutes / 60)
        const minute = currentMinutes % 60
        const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`
        
        // この時間に予約可能かチェック
        let isAvailable = !isDayFullyBooked
        
        if (isAvailable) {
          // 既存の予約をチェック
          for (const reservation of reservations) {
            const [resHour, resMinute] = reservation.time.split(':').map(Number)
            const resStartMinutes = resHour * 60 + resMinute
            const resEndMinutes = resStartMinutes + slotDuration
            
            // 予約時間が既存予約と重なる場合は不可
            if (
              (currentMinutes >= resStartMinutes && currentMinutes < resEndMinutes) || // 開始時間が既存予約内
              (currentMinutes + slotDuration > resStartMinutes && currentMinutes + slotDuration <= resEndMinutes) || // 終了時間が既存予約内
              (currentMinutes <= resStartMinutes && currentMinutes + slotDuration >= resEndMinutes) // 既存予約を包含
            ) {
              isAvailable = false
              break
            }
          }
        }

        slots.push({
          time: timeStr,
          available: isAvailable,
          date: date,
          maxCapacity: this.settings.maxCapacityPerSlot,
          currentBookings: isAvailable ? 0 : 1,
        })
      }
    } else {
      // 単一予約の曜日（平日）：1日1枠のみ
      // 平日（月、火、木、金）は1件でも予約があれば不可
      const timeStr = businessHours.open
      const isAvailable = reservations.length === 0 // 平日は1件でも予約があれば不可

      slots.push({
        time: timeStr,
        available: isAvailable,
        date: date,
        maxCapacity: 1, // 平日は1日1枠のみ
        currentBookings: reservations.length,
      })
    }

    // 結果をキャッシュに保存（2分間、サーバーサイドのみ）
    if (typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('time-slots', date)
      await cache.set(cacheKey, slots, 120, {
        tags: ['reservations', `date-${date}`],
      })
    }

    return slots
  }

  // 特定の日付が予約可能かチェック
  async isDateAvailable(date: string): Promise<boolean> {
    const slots = await this.getTimeSlotsForDate(date)
    return slots.some((slot) => slot.available)
  }

  // 月の予約状況サマリーを取得（最適化版）
  async getMonthAvailability(year: number, month: number): Promise<Map<string, boolean>> {
    // 設定が読み込まれるまで待つ
    await this.waitForSettings()
    // キャッシュから取得を試みる（サーバーサイドのみ）
    if (typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('month-availability', year, month)
      const cached = await cache.get<{ [key: string]: boolean }>(cacheKey)
      if (cached) {
        return new Map(Object.entries(cached))
      }
    }

    const availability = new Map<string, boolean>()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Get today's date string for comparison
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // 月内の全予約を一度に取得
    const monthReservations = await firebaseReservationService.getReservationsByMonth(year, month)
    
    // 営業時間の設定を事前に取得
    const businessHours = this.settings.businessHours
    const blockedDates = this.settings.blockedDates || []

    for (let day = 1; day <= daysInMonth; day++) {
      // Create date string in YYYY-MM-DD format
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      // 過去の日付は予約不可
      if (dateStr < todayStr) {
        availability.set(dateStr, false)
        continue
      }

      // ブロック日付をチェック
      if (blockedDates.includes(dateStr)) {
        availability.set(dateStr, false)
        continue
      }

      // 曜日から営業日かチェック
      const dateObj = new Date(year, month, day)
      const dayOfWeek = dateObj.getDay()
      const dayBusinessHours = businessHours[dayOfWeek]

      if (!dayBusinessHours.isOpen) {
        availability.set(dateStr, false)
        continue
      }

      // その日の予約状況を取得
      const dayReservations = monthReservations.get(dateStr) || []
      
      // その日の最大受付人数を取得
      const maxCapacityPerDay = dayBusinessHours.maxCapacityPerDay || 1
      
      // その日の合計予約数をチェック
      const totalReservationsForDay = dayReservations.length
      const isDayFullyBooked = totalReservationsForDay >= maxCapacityPerDay
      
      // 既に1日の最大数に達していれば予約不可
      if (isDayFullyBooked) {
        availability.set(dateStr, false)
        continue
      }
      
      // 時間枠を計算して空きがあるかチェック
      const [openHour, openMinute] = dayBusinessHours.open.split(':').map(Number)
      const [closeHour, closeMinute] = dayBusinessHours.close.split(':').map(Number)
      const openTimeInMinutes = openHour * 60 + openMinute
      const closeTimeInMinutes = closeHour * 60 + closeMinute
      const slotDuration = this.settings.slotDuration || 120
      
      let hasAvailableSlot = false
      
      if (dayBusinessHours.allowMultipleSlots) {
        // 複数予約可能な曜日：設定された間隔で時間枠をチェック
        const interval = dayBusinessHours.slotInterval || 30
        for (let currentMinutes = openTimeInMinutes; currentMinutes <= closeTimeInMinutes - slotDuration; currentMinutes += interval) {
          const hour = Math.floor(currentMinutes / 60)
          const minute = currentMinutes % 60
          const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`
          
          // この時間に予約可能かチェック（時間重複チェック）
          let isTimeSlotAvailable = true
          
          for (const reservation of dayReservations) {
            const [resHour, resMinute] = reservation.time.split(':').map(Number)
            const resStartMinutes = resHour * 60 + resMinute
            const resEndMinutes = resStartMinutes + slotDuration
            
            if (
              (currentMinutes >= resStartMinutes && currentMinutes < resEndMinutes) ||
              (currentMinutes + slotDuration > resStartMinutes && currentMinutes + slotDuration <= resEndMinutes) ||
              (currentMinutes <= resStartMinutes && currentMinutes + slotDuration >= resEndMinutes)
            ) {
              isTimeSlotAvailable = false
              break
            }
          }
          
          if (isTimeSlotAvailable) {
            hasAvailableSlot = true
            break
          }
        }
      } else {
        // 単一予約の曜日（平日）：1日1枠のみ
        // 平日（月、火、木、金）は1件でも予約があれば不可
        if (dayReservations.length === 0) {
          hasAvailableSlot = true
        }
      }
      
      availability.set(dateStr, hasAvailableSlot)
    }

    // 結果をキャッシュに保存（5分間、サーバーサイドのみ）
    if (typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('month-availability', year, month)
      const cacheData = Object.fromEntries(availability)
      await cache.set(cacheKey, cacheData, 300, {
        tags: ['reservations', `month-${year}-${month}`],
      })
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

  // 予約がキャンセル可能かどうか判定
  canCancelReservation(reservation: Reservation): boolean {
    // すでにキャンセル済みまたは完了済みの場合はキャンセル不可
    if (reservation.status === 'cancelled' || reservation.status === 'completed') {
      return false
    }

    // キャンセル期限の設定を取得（デフォルト24時間）
    const deadlineHours = this.settings.cancellationDeadlineHours || 24

    // 予約日時を作成
    const reservationDateTime = new Date(`${reservation.date}T${reservation.time}`)
    const now = new Date()

    // 予約日時までの時間差を計算（ミリ秒）
    const timeDiff = reservationDateTime.getTime() - now.getTime()
    const hoursUntilReservation = timeDiff / (1000 * 60 * 60)

    // キャンセル期限内かどうか判定
    return hoursUntilReservation >= deadlineHours
  }

  // キャンセル可能な残り時間を取得（時間単位）
  getCancellationDeadlineRemaining(reservation: Reservation): number | null {
    if (!this.canCancelReservation(reservation)) {
      return null
    }

    const deadlineHours = this.settings.cancellationDeadlineHours || 24
    const reservationDateTime = new Date(`${reservation.date}T${reservation.time}`)
    const now = new Date()

    const timeDiff = reservationDateTime.getTime() - now.getTime()
    const hoursUntilReservation = timeDiff / (1000 * 60 * 60)

    return Math.max(0, hoursUntilReservation - deadlineHours)
  }
}

export const reservationService = new ReservationService()
