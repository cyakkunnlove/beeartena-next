import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase/config'

import { ReservationSettings, BusinessHours } from '@/lib/types'

const SETTINGS_DOC_ID = 'reservation-settings'

export const settingsService = {
  // 設定を取得
  async getSettings(): Promise<ReservationSettings | null> {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ReservationSettings
        
        // 営業時間設定のフィールドを検証・補完
        if (data.businessHours) {
          data.businessHours = data.businessHours.map(hours => ({
            dayOfWeek: hours.dayOfWeek,
            open: hours.open,
            close: hours.close,
            isOpen: hours.isOpen,
            allowMultipleSlots: hours.allowMultipleSlots ?? false,
            slotInterval: hours.slotInterval,
            maxCapacityPerDay: hours.maxCapacityPerDay ?? 1,
          }))
        }
        
        return data
      }
      
      return null
    } catch (error) {
      console.error('設定の取得エラー:', error)
      return null
    }
  },

  // 設定を保存
  async saveSettings(settings: ReservationSettings): Promise<void> {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
      
      // 営業時間設定に必要なフィールドが含まれていることを確認
      const businessHours = settings.businessHours.map((hours) => {
        const allowMultipleSlots = Boolean(hours.allowMultipleSlots)
        const normalized = {
          dayOfWeek: hours.dayOfWeek,
          open: hours.open || '',
          close: hours.close || '',
          isOpen: Boolean(hours.isOpen),
          allowMultipleSlots,
          maxCapacityPerDay: Number.isFinite(hours.maxCapacityPerDay)
            ? Number(hours.maxCapacityPerDay)
            : 1,
        } as BusinessHours

        if (allowMultipleSlots) {
          const interval = Number(hours.slotInterval ?? 30)
          normalized.slotInterval = Number.isFinite(interval) && interval > 0 ? interval : 30
        }

        return normalized
      })

      const blockedDates = Array.isArray(settings.blockedDates)
        ? settings.blockedDates.filter((date): date is string => typeof date === 'string' && Boolean(date))
        : []

      const sanitizedSettings: ReservationSettings = {
        slotDuration: Number.isFinite(settings.slotDuration) ? settings.slotDuration : 120,
        maxCapacityPerSlot: Number.isFinite(settings.maxCapacityPerSlot)
          ? settings.maxCapacityPerSlot
          : 1,
        businessHours,
        blockedDates,
        cancellationDeadlineHours: Number.isFinite(settings.cancellationDeadlineHours)
          ? settings.cancellationDeadlineHours
          : 72,
        cancellationPolicy:
          settings.cancellationPolicy?.trim() ||
          '予約日の3日前（72時間前）までキャンセルが可能です。それ以降はお電話にてご連絡ください。',
      }

      await setDoc(docRef, {
        ...sanitizedSettings,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error('設定の保存エラー:', error)
      throw error
    }
  },
}
