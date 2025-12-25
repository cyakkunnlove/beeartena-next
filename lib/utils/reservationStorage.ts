/**
 * 予約情報のセッションストレージ管理
 */

import type { ReservationIntakeForm } from '@/lib/types'
import { createDefaultIntakeForm, normalizeIntakeForm } from '@/lib/utils/intakeFormDefaults'

const STORAGE_KEY = 'pending_reservation'

const readStorage = (storage: Storage | undefined): string | null => {
  if (!storage) return null
  try {
    return storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStorage = (storage: Storage | undefined, value: string | null) => {
  if (!storage) return
  try {
    if (value === null) {
      storage.removeItem(STORAGE_KEY)
    } else {
      storage.setItem(STORAGE_KEY, value)
    }
  } catch {
    // no-op
  }
}

export interface PendingReservation {
  serviceId: string
  serviceType?: '2D' | '3D' | '4D' | 'wax' | string
  serviceName: string
  date: string
  time: string
  maintenanceOptions?: string[]
  maintenancePrice?: number
  formData: {
    name: string
    email: string
    phone: string
    notes: string
    intakeForm: ReservationIntakeForm
    isMonitorSelected?: boolean
  }
  step: number
  pointsToUse?: number
  isMonitor?: boolean
  isReadyToSubmit?: boolean // 予約確定ボタンを押した状態かどうか
  timestamp: number
}

export const reservationStorage = {
  /**
   * 予約情報を保存
   */
  save(data: Omit<PendingReservation, 'timestamp'>): void {
    if (typeof window === 'undefined') return

    const pendingReservation: PendingReservation = {
      ...data,
      formData: {
        ...data.formData,
        intakeForm: normalizeIntakeForm(data.formData.intakeForm),
      },
      timestamp: Date.now(),
    }

    const serialized = JSON.stringify(pendingReservation)
    writeStorage(window.sessionStorage, serialized)
    writeStorage(window.localStorage, serialized)
  },

  /**
   * 予約情報を取得
   */
  get(): PendingReservation | null {
    if (typeof window === 'undefined') return null

    const stored =
      readStorage(window.sessionStorage) ??
      readStorage(window.localStorage)
    if (!stored) return null

    try {
      const data = JSON.parse(stored) as PendingReservation

      // 1時間以上経過している場合は無効とする
      const oneHour = 60 * 60 * 1000
      if (Date.now() - data.timestamp > oneHour) {
        this.clear()
        return null
      }

      const baseFormData = data.formData ?? {
        name: '',
        email: '',
        phone: '',
        notes: '',
        intakeForm: createDefaultIntakeForm(),
        isMonitorSelected: false,
      }

      const normalized = {
        ...data,
        formData: {
          ...baseFormData,
          intakeForm: normalizeIntakeForm(baseFormData.intakeForm),
        },
      }
      // sessionStorageへ復元しておく（別タブ/リダイレクト対策）
      writeStorage(window.sessionStorage, JSON.stringify(normalized))
      return normalized
    } catch {
      return null
    }
  },

  /**
   * 予約情報をクリア
   */
  clear(): void {
    if (typeof window === 'undefined') return
    writeStorage(window.sessionStorage, null)
    writeStorage(window.localStorage, null)
  },

  /**
   * 予約情報が存在するか確認
   */
  exists(): boolean {
    return this.get() !== null
  },
}
