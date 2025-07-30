import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { ReservationSettings } from '@/lib/types'

const SETTINGS_DOC_ID = 'reservation-settings'

export const settingsService = {
  // 設定を取得
  async getSettings(): Promise<ReservationSettings | null> {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return docSnap.data() as ReservationSettings
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
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error('設定の保存エラー:', error)
      throw error
    }
  },
}