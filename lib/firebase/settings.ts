import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

import { BusinessHours, ReservationSettings } from '../types'
import { db, isFirebaseConfigured } from './config'

// デフォルトの営業時間設定
const defaultBusinessHours: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false }, // 日曜休み
  { dayOfWeek: 1, open: '18:30', close: '21:00', isOpen: true }, // 月曜
  { dayOfWeek: 2, open: '18:30', close: '21:00', isOpen: true }, // 火曜
  { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true }, // 水曜
  { dayOfWeek: 4, open: '18:30', close: '21:00', isOpen: true }, // 木曜
  { dayOfWeek: 5, open: '18:30', close: '21:00', isOpen: true }, // 金曜
  { dayOfWeek: 6, open: '18:30', close: '21:00', isOpen: true }, // 土曜
]

const defaultSettings: ReservationSettings = {
  slotDuration: 150, // 2時間30分
  maxCapacityPerSlot: 1,
  businessHours: defaultBusinessHours,
  blockedDates: [],
}

export const settingsService = {
  // 設定の取得
  async getSettings(): Promise<ReservationSettings> {
    if (!isFirebaseConfigured()) {
      return defaultSettings
    }

    try {
      const docRef = await getDoc(doc(db, 'settings', 'reservation'))
      if (docRef.exists()) {
        const data = docRef.data()
        return {
          slotDuration: data.slotDuration || defaultSettings.slotDuration,
          maxCapacityPerSlot: data.maxCapacityPerSlot || defaultSettings.maxCapacityPerSlot,
          businessHours: data.businessHours || defaultSettings.businessHours,
          blockedDates: data.blockedDates || defaultSettings.blockedDates,
        }
      }
      
      // 設定が存在しない場合はデフォルトを保存
      await this.saveSettings(defaultSettings)
      return defaultSettings
    } catch (error) {
      console.error('設定の取得エラー:', error)
      return defaultSettings
    }
  },

  // 設定の保存
  async saveSettings(settings: ReservationSettings): Promise<void> {
    if (!isFirebaseConfigured()) {
      return
    }

    try {
      await setDoc(doc(db, 'settings', 'reservation'), {
        ...settings,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error('設定の保存エラー:', error)
      throw new Error('設定の保存に失敗しました')
    }
  },

  // 営業時間の更新
  async updateBusinessHours(businessHours: BusinessHours[]): Promise<void> {
    const currentSettings = await this.getSettings()
    await this.saveSettings({
      ...currentSettings,
      businessHours,
    })
  },

  // ブロック日付の追加
  async addBlockedDate(date: string): Promise<void> {
    const currentSettings = await this.getSettings()
    const blockedDates = [...(currentSettings.blockedDates || []), date]
    await this.saveSettings({
      ...currentSettings,
      blockedDates,
    })
  },

  // ブロック日付の削除
  async removeBlockedDate(date: string): Promise<void> {
    const currentSettings = await this.getSettings()
    const blockedDates = (currentSettings.blockedDates || []).filter(d => d !== date)
    await this.saveSettings({
      ...currentSettings,
      blockedDates,
    })
  },
}