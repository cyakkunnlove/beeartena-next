import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './config'
import { pointService } from './points'
import { reservationService } from './reservations'
import { Reservation } from '../types'

export const reservationStatusManager = {
  /**
   * 完了すべき予約を自動的に完了ステータスに更新し、ポイントを付与する
   * この関数は管理画面から手動で実行するか、定期実行する
   */
  async processCompletedReservations(): Promise<{
    processedCount: number
    errors: Array<{ reservationId: string; error: string }>
  }> {
    if (!isFirebaseConfigured()) {
      console.log('Firebase not configured')
      return { processedCount: 0, errors: [] }
    }

    const errors: Array<{ reservationId: string; error: string }> = []
    let processedCount = 0

    try {
      // 現在の日時を取得
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

      // 昨日以前の「confirmed」ステータスの予約を取得
      const q = query(
        collection(db, 'reservations'),
        where('status', '==', 'confirmed'),
        where('date', '<', todayStr)
      )

      const querySnapshot = await getDocs(q)
      
      for (const doc of querySnapshot.docs) {
        const reservation = {
          ...doc.data(),
          id: doc.id,
        } as Reservation

        try {
          // 予約の日付と時間から、施術が終了したか確認
          const reservationDateTime = new Date(`${reservation.date}T${reservation.time}:00`)
          const hoursAfterReservation = (now.getTime() - reservationDateTime.getTime()) / (1000 * 60 * 60)
          
          // 予約時間から3時間経過していれば完了とみなす（施術時間を考慮）
          if (hoursAfterReservation >= 3) {
            // ステータスを完了に更新
            await reservationService.updateReservationStatus(
              reservation.id,
              'completed',
              'system'
            )

            // ログインユーザーの予約の場合のみポイント付与
            if (reservation.customerId) {
              // 実際の支払い金額を計算（ポイント利用分を除く）
              const pointsAmount = reservation.finalPrice || reservation.totalPrice || reservation.price
              
              // ポイントを付与（5%還元）
              await pointService.addReservationPoints(
                reservation.customerId,
                pointsAmount
              )
              
              console.log(`Points awarded for reservation ${reservation.id}: ${Math.floor(pointsAmount * 0.05)} points`)
            }

            processedCount++
          }
        } catch (error: any) {
          console.error(`Error processing reservation ${reservation.id}:`, error)
          errors.push({
            reservationId: reservation.id,
            error: error.message || 'Unknown error'
          })
        }
      }

      return { processedCount, errors }
    } catch (error: any) {
      console.error('Error in processCompletedReservations:', error)
      throw new Error(error.message || '予約ステータスの更新に失敗しました')
    }
  },

  /**
   * 特定の予約を手動で完了にしてポイントを付与
   */
  async completeReservationManually(
    reservationId: string,
    adminUserId?: string
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured')
    }

    try {
      // 予約情報を取得
      const reservation = await reservationService.getReservation(reservationId)
      
      if (!reservation) {
        throw new Error('予約が見つかりません')
      }

      if (reservation.status === 'completed') {
        throw new Error('この予約は既に完了しています')
      }

      if (reservation.status === 'cancelled') {
        throw new Error('キャンセルされた予約は完了にできません')
      }

      // ステータスを完了に更新
      await reservationService.updateReservationStatus(
        reservationId,
        'completed',
        adminUserId || 'manual'
      )

      // ログインユーザーの予約の場合のみポイント付与
      if (reservation.customerId) {
        // 実際の支払い金額を計算（ポイント利用分を除く）
        const pointsAmount = reservation.finalPrice || reservation.totalPrice || reservation.price
        
        // ポイントを付与（5%還元）
        await pointService.addReservationPoints(
          reservation.customerId,
          pointsAmount
        )
        
        console.log(`Points manually awarded for reservation ${reservationId}: ${Math.floor(pointsAmount * 0.05)} points`)
      }
    } catch (error: any) {
      console.error('Error in completeReservationManually:', error)
      throw new Error(error.message || '予約の完了処理に失敗しました')
    }
  },

  /**
   * 予約を確認済みにする（ポイントはまだ付与しない）
   */
  async confirmReservation(
    reservationId: string,
    adminUserId?: string
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured')
    }

    try {
      const reservation = await reservationService.getReservation(reservationId)
      
      if (!reservation) {
        throw new Error('予約が見つかりません')
      }

      if (reservation.status !== 'pending') {
        throw new Error('この予約は既に処理されています')
      }

      // ステータスを確認済みに更新
      await reservationService.updateReservationStatus(
        reservationId,
        'confirmed',
        adminUserId || 'manual'
      )
    } catch (error: any) {
      console.error('Error in confirmReservation:', error)
      throw new Error(error.message || '予約の確認処理に失敗しました')
    }
  },

  /**
   * 今日の予約で完了すべきものをチェック
   */
  async checkTodayReservations(): Promise<Reservation[]> {
    if (!isFirebaseConfigured()) {
      return []
    }

    try {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      
      // 今日の確認済み予約を取得
      const q = query(
        collection(db, 'reservations'),
        where('status', '==', 'confirmed'),
        where('date', '==', todayStr)
      )

      const querySnapshot = await getDocs(q)
      const reservations: Reservation[] = []
      
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const reservation = {
          ...data,
          id: doc.id,
          date: data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as Reservation

        // 予約時間が過ぎているかチェック
        const reservationDateTime = new Date(`${reservation.date}T${reservation.time}:00`)
        if (reservationDateTime < now) {
          reservations.push(reservation)
        }
      })

      return reservations
    } catch (error: any) {
      console.error('Error in checkTodayReservations:', error)
      return []
    }
  }
}