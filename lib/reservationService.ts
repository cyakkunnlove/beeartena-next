import { emailService } from '@/lib/email/emailService'
import {
  BusinessHours,
  Reservation,
  ReservationSettings,
  TimeSlot,
  getErrorMessage,
} from '@/lib/types'
import admin, { getAdminDb } from '@/lib/firebase/admin'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'
import { settingsService } from '@/lib/firebase/settings'
import { POINTS_PROGRAM_ENABLED } from '@/lib/constants/featureFlags'
import { pointService } from '@/lib/firebase/points'
import { logger } from '@/lib/utils/logger'
import { exportReservationsToICal } from '@/lib/utils/reservations/exportToICal'
import { normalizeSettings } from '@/lib/utils/reservationSettings'

const isBrowser = typeof window !== 'undefined'
const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'

const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 }, // 日曜休み
  { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 月曜
  { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 火曜
  {
    dayOfWeek: 3,
    open: '09:00',
    close: '17:00',
    isOpen: true,
    maxCapacityPerDay: 10,
  }, // 水曜
  { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 木曜
  { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 金曜
  { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 }, // 土曜
]

const LEGACY_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 },
  { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  {
    dayOfWeek: 3,
    open: '09:00',
    close: '17:00',
    isOpen: true,
    allowMultipleSlots: true,
    slotInterval: 30,
    maxCapacityPerDay: 10,
  },
  { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
]

const isLegacyBusinessHours = (hoursList?: BusinessHours[]) => {
  if (!hoursList || hoursList.length !== LEGACY_BUSINESS_HOURS.length) {
    return false
  }

  return hoursList.every((hours, index) => {
    const legacy = LEGACY_BUSINESS_HOURS[index]
    if (!legacy) return false

    return (
      hours.dayOfWeek === legacy.dayOfWeek &&
      (hours.open || '') === (legacy.open || '') &&
      (hours.close || '') === (legacy.close || '') &&
      Boolean(hours.isOpen) === Boolean(legacy.isOpen)
    )
  })
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

// キャッシュ関連の型定義
interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, data: unknown, ttl?: number, options?: { tags?: string[] }): Promise<void>
  delete(key: string): Promise<void>
  invalidateByTag(tag: string): Promise<void>
}

type CacheKeyGenerator = (prefix: string, ...args: unknown[]) => string

// ダミーキャッシュ（クライアントサイド用）
class DummyCache implements CacheAdapter {
  async get<T = unknown>(_key: string): Promise<T | null> {
    return null
  }

  async set(
    _key: string,
    _data: unknown,
    _ttl?: number,
    _options?: { tags?: string[] },
  ): Promise<void> {
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
let cache: CacheAdapter = new DummyCache()
let Cache: { generateKey: CacheKeyGenerator } = {
  generateKey: (prefix: string, ...args: unknown[]) => [prefix, ...args].join(':'),
}

const clientTimeSlotCache = isBrowser ? new Map<string, TimeSlot[]>() : null

const clientMonthAvailabilityCache = isBrowser
  ? new Map<string, Map<string, boolean>>()
  : null

if (typeof window === 'undefined') {
  void import('@/lib/api/cache.server')
    .then((cacheModule) => {
      cache = cacheModule.cache as CacheAdapter
      Cache = {
        generateKey: (prefix: string, ...args: unknown[]) =>
          cacheModule.Cache.generateKey(prefix, ...args),
      }
    })
    .catch((error: unknown) => {
      logger.warn('Cache module not available', { error: getErrorMessage(error) })
    })
}

let adminUserService: typeof import('@/lib/firebase/users').userService | null = null

const getAdminUserService = async () => {
  if (typeof window !== 'undefined') {
    return null
  }

  if (adminUserService) {
    return adminUserService
  }

  try {
    const module = await import('@/lib/firebase/users')
    adminUserService = module.userService
    return adminUserService
  } catch (error) {
    logger.warn('Admin user service not available', { error: getErrorMessage(error) })
    return null
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

export function validateReservationData(data: Record<string, unknown>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  const dateValue = data.date
  if (!isNonEmptyString(dateValue)) {
    errors.push('日付を選択してください')
  } else {
    const selectedDate = new Date(dateValue)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      errors.push('予約日は今日以降の日付を選択してください')
    }
  }

  const timeValue = data.time
  if (!isNonEmptyString(timeValue)) {
    errors.push('時間を選択してください')
  } else {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(timeValue)) {
      errors.push('無効な時間形式です')
    }
  }

  if (!isNonEmptyString(data.service)) {
    errors.push('サービスを選択してください')
  }

  if (!isNonEmptyString(data.userId)) {
    errors.push('ユーザー情報が必要です')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

class ReservationService {
  private settings: ReservationSettings = {
    slotDuration: 60,
    maxCapacityPerSlot: 1,
    businessHours: DEFAULT_BUSINESS_HOURS.map((hours) => ({ ...hours })),
    blockedDates: [],
    cancellationDeadlineHours: 24, // デフォルト24時間前
    cancellationPolicy: '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
  }
  private isSettingsLoaded = false
  private settingsLoadPromise: Promise<void> | null = null
  private preloadedReservationsByDate: Map<string, Reservation[]> = new Map()

  constructor() {
    // Load settings from localStorage if exists (for immediate use)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservationSettings')
      if (saved) {
        try {
          const savedSettings = JSON.parse(saved) as Partial<ReservationSettings> & {
            businessHours?: Array<Partial<BusinessHours>>
          }

          const businessHours = (savedSettings.businessHours ?? []).map((hours) => {
            const defaultHours = this.settings.businessHours.find(
              (h) => h.dayOfWeek === hours.dayOfWeek,
            )

            return {
              ...defaultHours,
              ...hours,
              allowMultipleSlots:
                hours.allowMultipleSlots ?? defaultHours?.allowMultipleSlots ?? false,
              slotInterval: hours.slotInterval ?? defaultHours?.slotInterval,
              maxCapacityPerDay: hours.maxCapacityPerDay ?? defaultHours?.maxCapacityPerDay ?? 1,
            }
          })

          this.settings = {
            ...this.settings,
            ...savedSettings,
            businessHours,
            cancellationDeadlineHours: savedSettings.cancellationDeadlineHours ?? 24,
            cancellationPolicy:
              savedSettings.cancellationPolicy ||
              '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
          }
          this.isSettingsLoaded = true
        } catch (error) {
          logger.warn('Failed to parse reservation settings from localStorage', {
            error: getErrorMessage(error),
          })
        }
      }
    }
    if (this.isSettingsLoaded) {
      this.settingsLoadPromise = Promise.resolve()
    } else {
      this.settingsLoadPromise = null
    }
  }
  
  private async loadSettingsFromFirestore(): Promise<void> {
    try {
      let firestoreSettings: ReservationSettings | null = null

      // サーバー側はAdmin SDK優先（Firestoreルールの影響を受けない）
      if (typeof window === 'undefined') {
        const db = getAdminDb()
        if (db) {
          const snap = await db.collection('settings').doc('reservation-settings').get()
          if (snap.exists) {
            firestoreSettings = normalizeSettings((snap.data() as Partial<ReservationSettings>) ?? null)
          }
        }
      }

      // フォールバック（旧実装）：クライアントSDKから取得
      if (!firestoreSettings && typeof settingsService?.getSettings === 'function') {
        const raw = await settingsService.getSettings()
        firestoreSettings = raw ? normalizeSettings(raw) : null
      }

      if (firestoreSettings) {
        this.settings = firestoreSettings

        if (typeof window !== 'undefined') {
          localStorage.setItem('reservationSettings', JSON.stringify(this.settings))
        }

        this.isSettingsLoaded = true
        return
      }
    } catch (error) {
      logger.error('Firestoreから設定を読み込めませんでした', {
        error: getErrorMessage(error),
      })
      throw error
    }

    this.isSettingsLoaded = true
  }

  // 設定が読み込まれるまで待つ
  async waitForSettings(): Promise<void> {
    if (this.isSettingsLoaded) return

    if (!this.settingsLoadPromise) {
      this.settingsLoadPromise = this.loadSettingsFromFirestore()
        .catch(() => {
          // 取得に失敗した場合はデフォルト設定のまま進行し、後続の呼び出しで再試行できるようにする
        })
        .finally(() => {
          if (!this.isSettingsLoaded) {
            this.settingsLoadPromise = null
          }
        })
    }

    if (this.settingsLoadPromise) {
      await this.settingsLoadPromise
    }
  }

  private mapReservationDocToReservation(
    id: string,
    data: Record<string, unknown>,
  ): Reservation {
    const toDateValue = (value: unknown): Date | undefined => {
      if (!value) return undefined
      if (value instanceof Date) return value
      if (typeof value === 'string') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? undefined : parsed
      }
      if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
        try {
          const parsed = (value as any).toDate()
          return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : undefined
        } catch {
          return undefined
        }
      }
      return undefined
    }

    return {
      ...(data as any),
      id,
      createdAt: toDateValue(data.createdAt) ?? new Date(),
      updatedAt: toDateValue(data.updatedAt),
      cancelledAt: toDateValue(data.cancelledAt) ?? null,
      completedAt: toDateValue(data.completedAt) ?? null,
    } as Reservation
  }

  private async fetchReservationsByDate(dateStr: string, dateObj: Date): Promise<Reservation[]> {
    // サーバー側はAdmin SDK優先（Firestoreルールの影響を受けない）
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        const snapshot = await db.collection('reservations').where('date', '==', dateStr).get()
        return snapshot.docs
          .map((doc) => this.mapReservationDocToReservation(doc.id, doc.data() as any))
          .filter((reservation) => reservation.status !== 'cancelled')
      }
    }

    // フォールバック（旧実装）
    try {
      return await firebaseReservationService.getReservationsByDate(dateObj)
    } catch (error) {
      logger.error('Failed to fetch reservations by date (fallback)', {
        date: dateStr,
        error: getErrorMessage(error),
      })
      return []
    }
  }

  async saveSettings(settings: ReservationSettings): Promise<void> {
    this.settings = settings
    this.isSettingsLoaded = true
    this.settingsLoadPromise = Promise.resolve()
    
    // localStorageに即座に保存（UIの即時反映のため）
    if (isBrowser) {
      localStorage.setItem('reservationSettings', JSON.stringify(settings))
    }

    if (!isBrowser && !isTestEnv) {
      try {
        await settingsService.saveSettings(settings)
      } catch (error) {
        logger.error('設定の保存に失敗しました', {
          error: getErrorMessage(error),
        })
        throw error
      }
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
    const reservationData =
      createdBy !== undefined
        ? { ...reservation, createdBy }
        : reservation

    // サーバー側はAdmin SDK優先（Firestoreルールの影響を受けない）
    let newReservation: Reservation
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (!db) {
        newReservation = await firebaseReservationService.createReservation(reservationData)
      } else {
        const reservationRef = db.collection('reservations').doc()
        const now = new Date()

        await reservationRef.set(
          {
            ...reservationData,
            id: reservationRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: false },
        )

        newReservation = {
          ...(reservationData as any),
          id: reservationRef.id,
          createdAt: now,
          updatedAt: now,
          status: (reservationData as any).status ?? 'pending',
        } as Reservation
      }
    } else {
      newReservation = await firebaseReservationService.createReservation(reservationData)
    }
    
    // メール送信処理（エラーが発生してもリザベーションは成功させる）
    try {
      // メールアドレスの取得（customerEmailが直接提供されている場合はそれを使用）
      let userEmail = newReservation.customerEmail
      
      // customerIdがある場合はユーザー情報から取得を試みる
      if (
        typeof window === 'undefined' &&
        newReservation.customerId &&
        newReservation.customerId !== 'guest'
      ) {
        try {
          const adminUserService = await getAdminUserService()
          if (adminUserService) {
            const user = await adminUserService.getUser(newReservation.customerId)
            if (user && user.email) {
              userEmail = user.email
            }
          }
        } catch (userError) {
          logger.warn('ユーザー情報取得エラー（メールアドレスは予約データから使用）', {
            error: getErrorMessage(userError),
          })
        }
      }
      
      if (userEmail) {
        // 顧客への確認メール
        await emailService.sendReservationConfirmation(newReservation, userEmail)
        // 管理者への通知メール
        await emailService.sendReservationNotificationToAdmin(newReservation)
      } else {
        logger.info('メールアドレスが見つからないため、メール送信をスキップしました')
      }
    } catch (error) {
      logger.error('メール送信エラー', {
        error: getErrorMessage(error),
      })
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
        cache.delete(Cache.generateKey('month-availability', year, month)),
      ])
    }

    // 予約完了時のポイント付与（予約金額の5%）※ポイント制度は廃止
    if (POINTS_PROGRAM_ENABLED && reservation.price && reservation.customerId) {
      await pointService.addReservationPoints(reservation.customerId, reservation.price)
    }

    return newReservation
  }

  // 予約取得
  async getReservation(id: string): Promise<Reservation | null> {
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        const doc = await db.collection('reservations').doc(id).get()
        if (!doc.exists) return null
        return this.mapReservationDocToReservation(doc.id, doc.data() as any)
      }
    }

    return firebaseReservationService.getReservation(id)
  }

  // ユーザーの予約一覧取得
  async getUserReservations(userId: string): Promise<Reservation[]> {
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        const snapshot = await db
          .collection('reservations')
          .where('customerId', '==', userId)
          .orderBy('date', 'desc')
          .get()

        return snapshot.docs.map((doc) => this.mapReservationDocToReservation(doc.id, doc.data() as any))
      }
    }

    return firebaseReservationService.getUserReservations(userId)
  }

  // 全予約取得（管理者用）
  async getAllReservations(): Promise<Reservation[]> {
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        const snapshot = await db.collection('reservations').orderBy('date', 'desc').get()
        return snapshot.docs.map((doc) => this.mapReservationDocToReservation(doc.id, doc.data() as any))
      }
    }

    return firebaseReservationService.getAllReservations()
  }

  // 予約確定
  async confirmReservation(id: string): Promise<void> {
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        await db.collection('reservations').doc(id).update({
          status: 'confirmed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return
      }
    }

    await firebaseReservationService.updateReservationStatus(id, 'confirmed')
  }

  // 予約キャンセル
  async cancelReservation(id: string, reason?: string): Promise<void> {
    const reservation = await this.getReservation(id)
    if (!reservation) {
      throw new Error('予約が見つかりません')
    }

    // キャンセル処理
    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        await db.collection('reservations').doc(id).update({
          status: 'cancelled',
          cancelReason: reason || '',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      } else {
        await firebaseReservationService.cancelReservation(id, reason)
      }
    } else {
      await firebaseReservationService.cancelReservation(id, reason)
    }

    // ポイント返却（ポイント制度は廃止のため無効）
    if (
      POINTS_PROGRAM_ENABLED &&
      reservation.status === 'confirmed' &&
      reservation.price &&
      reservation.customerId
    ) {
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
      logger.error('キャンセルメール送信エラー', {
        error: getErrorMessage(error),
      })
    }
  }

  // 予約完了処理
  async completeReservation(id: string, _completedBy?: string): Promise<void> {
    const reservation = await this.getReservation(id)
    if (!reservation) {
      throw new Error('予約が見つかりません')
    }

    if (typeof window === 'undefined') {
      const db = getAdminDb()
      if (db) {
        await db.collection('reservations').doc(id).update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      } else {
        await firebaseReservationService.updateReservationStatus(id, 'completed')
      }
    } else {
      await firebaseReservationService.updateReservationStatus(id, 'completed')
    }

    // 累計利用金額を更新
    if (
      reservation.price &&
      reservation.customerId &&
      typeof window === 'undefined'
    ) {
      const adminUserService = await getAdminUserService()
      if (adminUserService) {
        await adminUserService.updateTotalSpent(reservation.customerId, reservation.price)
      }
    }
  }

  // 特定の日付の予約可能な時間枠を取得
  async getTimeSlotsForDate(
    date: string,
    options?: { durationMinutes?: number; bypassCache?: boolean },
  ): Promise<TimeSlot[]> {
    // 設定が読み込まれるまで待つ
    await this.waitForSettings()

    const bypassCache = Boolean(options?.bypassCache)
    const defaultDuration = this.settings.slotDuration || 60
    const requiredDurationMinutesRaw = Number(options?.durationMinutes)
    const requiredDurationMinutes =
      Number.isFinite(requiredDurationMinutesRaw) && requiredDurationMinutesRaw > 0
        ? requiredDurationMinutesRaw
        : defaultDuration

    const cacheKeySuffix = `${requiredDurationMinutes}`

    if (!bypassCache && isBrowser && !isTestEnv) {
      const cachedSlots = clientTimeSlotCache?.get(`${date}|${cacheKeySuffix}`)
      if (cachedSlots) {
        return cachedSlots.map((slot) => ({ ...slot }))
      }
    }

    // キャッシュから取得を試みる（サーバーサイドのみ）
    if (!bypassCache && typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('time-slots', date, cacheKeySuffix)
      const cached = await cache.get<TimeSlot[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 日付文字列をローカルタイムで正確に解釈
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay()
    const configuredHours = this.settings.businessHours.find(
      (h) => h.dayOfWeek === dayOfWeek,
    )
    const defaultHours = DEFAULT_BUSINESS_HOURS.find((h) => h.dayOfWeek === dayOfWeek)

    // open/close が空の場合はデフォルト時間にフォールバック（isOpen=falseは尊重）
    const businessHours =
      configuredHours && configuredHours.isOpen &&
      isNonEmptyString(configuredHours.open) &&
      isNonEmptyString(configuredHours.close)
        ? configuredHours
        : configuredHours && !configuredHours.isOpen
          ? configuredHours
          : defaultHours

    if (
      !businessHours ||
      !businessHours.isOpen ||
      !isNonEmptyString(businessHours.open) ||
      !isNonEmptyString(businessHours.close) ||
      this.settings.blockedDates?.includes(date)
    ) {
      return []
    }

    let reservations: Reservation[]
    if (this.preloadedReservationsByDate.has(date)) {
      reservations = this.preloadedReservationsByDate.get(date) ?? []
    } else {
      reservations = await this.fetchReservationsByDate(date, dateObj)
      if (!isBrowser) {
        this.preloadedReservationsByDate.set(date, reservations)
      }
    }

    const [openHour, openMinute] = businessHours.open.split(':').map(Number)
    const [closeHour, closeMinute] = businessHours.close.split(':').map(Number)
    const openTimeInMinutes = openHour * 60 + openMinute
    const closeTimeInMinutes = closeHour * 60 + closeMinute

    const baseDuration = defaultDuration
    const totalMinutes = closeTimeInMinutes - openTimeInMinutes
    if (totalMinutes <= 0) {
      return []
    }

    if (requiredDurationMinutes > totalMinutes) {
      return []
    }

    const effectiveDurationMinutes = requiredDurationMinutes
    let interval = baseDuration

    const parseTimeToMinutes = (time: string): number | null => {
      const [hourStr, minuteStr] = time.split(':')
      const hour = Number(hourStr)
      const minute = Number(minuteStr)
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
      return hour * 60 + minute
    }

    if (businessHours.allowMultipleSlots) {
      interval = businessHours.slotInterval || 30
    } else {
      const totalMinutes = closeTimeInMinutes - openTimeInMinutes
      if (totalMinutes <= baseDuration) {
        interval = Math.min(baseDuration, 60)
      }
    }

    if (interval <= 0) {
      interval = 30
    }

    const slots: TimeSlot[] = []
    const maxCapacity = this.settings.maxCapacityPerSlot || 1

    const overrideAllowedSlots = this.settings.dateOverrides?.[date]?.allowedSlots
    const baseAllowedSlots = businessHours.allowedSlots
    const allowedSlotsSource =
      Array.isArray(overrideAllowedSlots) && overrideAllowedSlots.length > 0
        ? overrideAllowedSlots
        : Array.isArray(baseAllowedSlots) && baseAllowedSlots.length > 0
          ? baseAllowedSlots
          : null

    const explicitStartMinutes = allowedSlotsSource
      ? Array.from(
          new Set(
            allowedSlotsSource
              .map((slot) => parseTimeToMinutes(slot))
              .filter((value): value is number => typeof value === 'number'),
          ),
        )
          .sort((a, b) => a - b)
          .filter(
            (startMinutes) =>
              startMinutes >= openTimeInMinutes &&
              startMinutes + effectiveDurationMinutes <= closeTimeInMinutes,
          )
      : null

    const reservationsWithDuration = reservations
      .filter((reservation) => reservation.status !== 'cancelled')
      .map((reservation) => {
        const [hourStr = '0', minuteStr = '0'] = reservation.time.split(':')
        const startMinutes = Number(hourStr) * 60 + Number(minuteStr)
        const duration = Number.isFinite(Number(reservation.durationMinutes))
          ? Number(reservation.durationMinutes)
          : baseDuration
        const endMinutes = startMinutes + duration
        return {
          startMinutes,
          endMinutes,
        }
      })

    const startCandidates =
      explicitStartMinutes ??
      (() => {
        const generated: number[] = []
        for (
          let currentMinutes = openTimeInMinutes;
          currentMinutes + effectiveDurationMinutes <= closeTimeInMinutes;
          currentMinutes += interval
        ) {
          generated.push(currentMinutes)
        }
        return generated
      })()

    for (const startMinutes of startCandidates) {
      const hour = Math.floor(startMinutes / 60)
      const minute = startMinutes % 60
      const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`
      const candidateEndMinutes = startMinutes + effectiveDurationMinutes

      const overlappingCount = reservationsWithDuration.filter(({ startMinutes, endMinutes }) => {
        if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
          return false
        }
        return startMinutes < endMinutes && candidateEndMinutes > startMinutes
      }).length

      const currentBookings = overlappingCount
      const available = currentBookings < maxCapacity

      slots.push({
        time: timeStr,
        available,
        date,
        maxCapacity,
        currentBookings,
        requiredDurationMinutes: effectiveDurationMinutes,
      })
    }

    if (!bypassCache && isBrowser && !isTestEnv) {
      clientTimeSlotCache?.set(`${date}|${cacheKeySuffix}`, slots.map((slot) => ({ ...slot })))
    }

    // 結果をキャッシュに保存（2分間、サーバーサイドのみ）
    if (!bypassCache && typeof window === 'undefined') {
      const cacheKey = Cache.generateKey('time-slots', date, cacheKeySuffix)
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
    await this.waitForSettings()

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const serverCacheKey = Cache.generateKey('month-availability', year, month)

    if (isBrowser && !isTestEnv) {
      const cached = clientMonthAvailabilityCache?.get(monthPrefix)
      if (cached) {
        return new Map(cached)
      }
    } else {
      const cached = await cache.get<Record<string, boolean>>(serverCacheKey)
      if (cached) {
        return new Map(Object.entries(cached))
      }
    }

    let reservationsByDate = new Map<string, Reservation[]>()
    try {
      if (!isBrowser) {
        const db = getAdminDb()
        if (db) {
          const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
          const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`

          const snapshot = await db
            .collection('reservations')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get()

          snapshot.docs.forEach((doc) => {
            const reservation = this.mapReservationDocToReservation(doc.id, doc.data() as any)
            if (reservation.status === 'cancelled') return
            const dateStr = reservation.date
            if (!reservationsByDate.has(dateStr)) {
              reservationsByDate.set(dateStr, [])
            }
            reservationsByDate.get(dateStr)!.push(reservation)
          })
        } else {
          reservationsByDate = await firebaseReservationService.getReservationsByMonth(year, month)
        }
      } else {
        reservationsByDate = await firebaseReservationService.getReservationsByMonth(year, month)
      }
    } catch (error) {
      logger.error('Failed to preload monthly reservations', {
        year,
        month,
        error: getErrorMessage(error),
      })
    }

    const monthPrefetch = new Map<string, Reservation[]>()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`
      const reservationsForDate = reservationsByDate.get(dateStr) ?? []
      monthPrefetch.set(dateStr, reservationsForDate)
    }

    const targetPrefix = `${monthPrefix}-`
    for (const existingKey of Array.from(this.preloadedReservationsByDate.keys())) {
      if (existingKey.startsWith(targetPrefix)) {
        this.preloadedReservationsByDate.delete(existingKey)
      }
    }
    monthPrefetch.forEach((reservations, dateKey) => {
      this.preloadedReservationsByDate.set(dateKey, reservations)
    })

    const availability = new Map<string, boolean>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const blockedDates = new Set(this.settings.blockedDates ?? [])

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`
      const dateObj = new Date(year, month, day)
      dateObj.setHours(0, 0, 0, 0)

      if (blockedDates.has(dateStr) || dateObj < today) {
        availability.set(dateStr, false)
        continue
      }

      const dayOfWeek = dateObj.getDay()
      const businessHours = this.settings.businessHours.find(
        (hours) => hours.dayOfWeek === dayOfWeek,
      )

      if (!businessHours?.isOpen || !businessHours.open || !businessHours.close) {
        availability.set(dateStr, false)
        continue
      }

      try {
        const slots = await this.getTimeSlotsForDate(dateStr, { bypassCache: true })
        availability.set(dateStr, slots.some((slot) => slot.available))
      } catch (error) {
        logger.error('Month availability computation failed', {
          date: dateStr,
          error: getErrorMessage(error),
        })
        availability.set(dateStr, false)
      }
    }

    if (isBrowser && !isTestEnv && clientMonthAvailabilityCache) {
      clientMonthAvailabilityCache.set(monthPrefix, new Map(availability))
    }

    if (typeof window === 'undefined') {
      await cache.set(
        serverCacheKey,
        Object.fromEntries(availability),
        120,
        {
          tags: ['reservations', `month-${monthPrefix}`],
        },
      )
    }

    return availability
  }

  getCalendarEvents(
    reservations: Reservation[],
  ): Array<{
    id: string
    title: string
    start: Date
    end: Date
    resource: Reservation
    allDay: boolean
    status: Reservation['status']
  }> {
    return reservations.map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 2)

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
    return exportReservationsToICal(reservations)
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
    if (!['pending', 'confirmed'].includes(reservation.status)) {
      return false
    }

    const deadlineHours = this.settings.cancellationDeadlineHours ?? 24

    const [year, month, day] = `${reservation.date}`.split('T')[0].split('-').map(Number)
    const [hour = 0, minute = 0] = (reservation.time || '00:00').split(':').map(Number)
    if (![year, month, day].every(Number.isFinite)) {
      return false
    }

    const reservationDateTime = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (Number.isNaN(reservationDateTime.getTime())) {
      return false
    }

    const now = new Date()
    if (reservationDateTime <= now) {
      return false
    }

    const hoursUntilReservation =
      (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntilReservation >= deadlineHours
  }

  getCancellationDeadlineRemaining(reservation: Reservation): number | null {
    const deadlineHours = this.settings.cancellationDeadlineHours ?? 24

    const [year, month, day] = `${reservation.date}`.split('T')[0].split('-').map(Number)
    const [hour = 0, minute = 0] = (reservation.time || '00:00').split(':').map(Number)
    if (![year, month, day].every(Number.isFinite)) {
      return null
    }

    const reservationDateTime = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (Number.isNaN(reservationDateTime.getTime())) {
      return null
    }

    const now = new Date()
    const hoursUntilReservation =
      (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilReservation <= 0) {
      return null
    }

    const remaining = hoursUntilReservation - deadlineHours
    return remaining > 0 ? remaining : 0
  }
}

export const reservationService = new ReservationService()
