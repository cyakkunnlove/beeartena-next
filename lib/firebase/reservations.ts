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

import { db, isFirebaseConfigured } from './config'

export const reservationService = {
  // 予約作成
  async createReservation(
    reservation: Omit<Reservation, 'id' | 'createdAt'>,
  ): Promise<Reservation> {
    if (!isFirebaseConfigured()) {
      console.log('Using mock service for createReservation')
      return mockReservationService.createReservation(reservation)
    }

    try {
      const newReservation = {
        ...reservation,
        id: uuidv4(),
        createdAt: new Date(),
        status: 'pending' as const,
      }

      console.log('Creating reservation in Firebase:', newReservation)

      // dateが文字列の場合の処理
      const dateObj = typeof newReservation.date === 'string' 
        ? new Date(newReservation.date + 'T00:00:00') 
        : newReservation.date

      await setDoc(doc(db, 'reservations', newReservation.id), {
        ...newReservation,
        date: newReservation.date, // 文字列のまま保存
        createdAt: Timestamp.fromDate(newReservation.createdAt),
        updatedAt: Timestamp.now(),
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
        id: id,
        date: data.date, // 文字列のまま
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
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
          id: doc.id,
          date: data.date, // 文字列のまま
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
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
          id: doc.id,
          date: data.date, // 文字列のまま
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
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
    updatedBy?: string,
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockReservationService.updateReservationStatus(id, status)
    }

    try {
      const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
      }
      
      // ステータスに応じて追加フィールドを設定
      if (status === 'completed') {
        updateData.completedAt = Timestamp.now()
      }
      
      if (updatedBy) {
        updateData.updatedBy = updatedBy
      }
      
      await updateDoc(doc(db, 'reservations', id), updateData)
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
      // 日付を文字列形式に変換 (YYYY-MM-DD) - ローカルタイムで処理
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // 文字列で比較
      const q = query(
        collection(db, 'reservations'),
        where('date', '==', dateStr),
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          date: data.date, // 文字列のまま
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as Reservation
      })
    } catch (error: any) {
      throw new Error(error.message || '予約の検索に失敗しました')
    }
  },

  // 月単位で予約をバッチ取得（パフォーマンス最適化）
  async getReservationsByMonth(year: number, month: number): Promise<Map<string, Reservation[]>> {
    if (!isFirebaseConfigured()) {
      // モック実装
      const result = new Map<string, Reservation[]>()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const reservations = await mockReservationService.getReservationsByDate(date)
        if (reservations.length > 0) {
          result.set(dateStr, reservations)
        }
      }
      
      return result
    }

    try {
      // 月の開始日と終了日を計算
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`

      // 月内の全予約を一度に取得
      // 注: '!=' クエリはパフォーマンスが悪いため、クライアント側でフィルタリング
      const q = query(
        collection(db, 'reservations'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      )

      const querySnapshot = await getDocs(q)
      const reservationsByDate = new Map<string, Reservation[]>()

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const reservation = {
          ...data,
          id: doc.id,
          date: data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as Reservation

        // キャンセル済みの予約は除外
        if (reservation.status === 'cancelled') {
          return
        }

        const dateStr = reservation.date
        if (!reservationsByDate.has(dateStr)) {
          reservationsByDate.set(dateStr, [])
        }
        reservationsByDate.get(dateStr)!.push(reservation)
      })

      return reservationsByDate
    } catch (error: any) {
      throw new Error(error.message || '月間予約の取得に失敗しました')
    }
  },
}
