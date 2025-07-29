import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

import { mockReservationService } from '../mock/mockFirebase'
import { Reservation } from '../types'

import { db } from './config'

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

export const reservationService = {
  // 予約作成
  async createReservation(
    reservation: Omit<Reservation, 'id' | 'createdAt'>,
  ): Promise<Reservation> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.createReservation(reservation)
    }

    try {
      const newReservation = {
        ...reservation,
        id: uuidv4(),
        createdAt: new Date(),
        status: 'pending' as const,
      }

      await setDoc(doc(db, 'reservations', newReservation.id), {
        ...newReservation,
        date: Timestamp.fromDate(new Date(newReservation.date)),
        createdAt: Timestamp.fromDate(newReservation.createdAt),
      })

      return newReservation
    } catch (error: any) {
      console.error('Firebase reservation creation error:', error)
      throw new Error(error.message || '予約の作成に失敗しました')
    }
  },

  // 予約取得（ID指定）
  async getReservation(id: string): Promise<Reservation | null> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.getReservation(id)
    }

    try {
      const docRef = await getDoc(doc(db, 'reservations', id))
      if (!docRef.exists()) return null

      const data = docRef.data()
      return {
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate(),
      } as Reservation
    } catch (error: any) {
      throw new Error(error.message || '予約の取得に失敗しました')
    }
  },

  // ユーザーの予約一覧取得
  async getUserReservations(userId: string): Promise<Reservation[]> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.getUserReservations(userId)
    }

    try {
      const q = query(
        collection(db, 'reservations'),
        where('customerId', '==', userId),
        orderBy('date', 'desc'),
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
        } as Reservation
      })
    } catch (error: any) {
      throw new Error(error.message || '予約一覧の取得に失敗しました')
    }
  },

  // 全予約取得（管理者用）
  async getAllReservations(): Promise<Reservation[]> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.getAllReservations()
    }

    try {
      const q = query(collection(db, 'reservations'), orderBy('date', 'desc'))

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
        } as Reservation
      })
    } catch (error: any) {
      throw new Error(error.message || '予約一覧の取得に失敗しました')
    }
  },

  // 予約状態更新
  async updateReservationStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.updateReservationStatus(id, status)
    }

    try {
      await updateDoc(doc(db, 'reservations', id), {
        status,
        updatedAt: Timestamp.now(),
      })
    } catch (error: any) {
      throw new Error(error.message || '予約状態の更新に失敗しました')
    }
  },

  // 予約キャンセル
  async cancelReservation(id: string, reason?: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.cancelReservation(id, reason)
    }

    try {
      await updateDoc(doc(db, 'reservations', id), {
        status: 'cancelled',
        cancelReason: reason || '',
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    } catch (error: any) {
      throw new Error(error.message || '予約のキャンセルに失敗しました')
    }
  },

  // 日付で予約検索
  async getReservationsByDate(date: Date): Promise<Reservation[]> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.getReservationsByDate(date)
    }

    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // インデックスエラーを回避するため、一時的に簡略化
      const q = query(
        collection(db, 'reservations'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
        } as Reservation
      })
    } catch (error: any) {
      throw new Error(error.message || '予約の検索に失敗しました')
    }
  },
}
