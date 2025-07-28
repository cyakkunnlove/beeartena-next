import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

import { mockPointService } from '../mock/mockFirebase'
import { PointTransaction as Point } from '../types'

import { db } from './config'

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

export const pointService = {
  // ポイント付与
  async addPoints(
    userId: string,
    amount: number,
    description: string,
    type: 'earned' | 'redeemed' | 'manual' = 'earned',
  ): Promise<Point> {
    if (!isFirebaseConfigured()) {
      return mockPointService.addPoints(userId, amount, description)
    }

    try {
      return await runTransaction(db, async (transaction) => {
        // ユーザーのポイント残高を更新
        const userRef = doc(db, 'users', userId)
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('ユーザーが見つかりません')
        }

        // 現在のポイント残高を取得
        const currentPoints = userDoc.data()?.points || 0
        const newBalance = currentPoints + amount

        // ポイント履歴を作成
        const pointHistory: Point = {
          id: uuidv4(),
          userId,
          amount,
          type: type,
          balance: newBalance,
          description,
          createdAt: new Date(),
        }

        // ユーザーのポイント残高を更新
        transaction.update(userRef, {
          points: increment(amount),
        })

        // ポイント履歴を保存
        const pointRef = doc(db, 'points', pointHistory.id)
        transaction.set(pointRef, {
          ...pointHistory,
          createdAt: Timestamp.fromDate(
            typeof pointHistory.createdAt === 'string'
              ? new Date(pointHistory.createdAt)
              : pointHistory.createdAt,
          ),
        })

        return pointHistory
      })
    } catch (error: any) {
      throw new Error(error.message || 'ポイント付与に失敗しました')
    }
  },

  // ポイント使用
  async usePoints(userId: string, amount: number, description: string): Promise<Point> {
    if (!isFirebaseConfigured()) {
      return mockPointService.usePoints(userId, amount, description)
    }

    try {
      return await runTransaction(db, async (transaction) => {
        // ユーザーのポイント残高を確認
        const userRef = doc(db, 'users', userId)
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('ユーザーが見つかりません')
        }

        const userData = userDoc.data()
        const currentPoints = userData.points || 0
        if (currentPoints < amount) {
          throw new Error('ポイントが不足しています')
        }

        const newBalance = currentPoints - amount

        // ポイント履歴を作成
        const pointHistory: Point = {
          id: uuidv4(),
          userId,
          amount,
          type: 'used',
          balance: newBalance,
          description,
          createdAt: new Date(),
        }

        // ユーザーのポイント残高を更新
        transaction.update(userRef, {
          points: increment(-amount),
        })

        // ポイント履歴を保存
        const pointRef = doc(db, 'points', pointHistory.id)
        transaction.set(pointRef, {
          ...pointHistory,
          createdAt: Timestamp.fromDate(
            typeof pointHistory.createdAt === 'string'
              ? new Date(pointHistory.createdAt)
              : pointHistory.createdAt,
          ),
        })

        return pointHistory
      })
    } catch (error: any) {
      throw new Error(error.message || 'ポイント使用に失敗しました')
    }
  },

  // ユーザーのポイント履歴取得
  async getUserPointHistory(userId: string): Promise<Point[]> {
    if (!isFirebaseConfigured()) {
      return mockPointService.getUserPointHistory(userId)
    }

    try {
      const q = query(
        collection(db, 'points'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
        } as Point
      })
    } catch (error: any) {
      throw new Error(error.message || 'ポイント履歴の取得に失敗しました')
    }
  },

  // ユーザーのポイント残高取得
  async getUserPoints(userId: string): Promise<number> {
    if (!isFirebaseConfigured()) {
      return mockPointService.getUserPoints(userId)
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません')
      }
      return userDoc.data().points || 0
    } catch (error: any) {
      throw new Error(error.message || 'ポイント残高の取得に失敗しました')
    }
  },

  // 予約完了時のポイント付与（5%還元）
  async addReservationPoints(userId: string, reservationAmount: number): Promise<Point> {
    const pointAmount = Math.floor(reservationAmount * 0.05)
    return this.addPoints(userId, pointAmount, `予約完了ポイント（${reservationAmount}円の5%）`)
  },

  // ランクに応じたボーナスポイント付与
  async addRankBonus(userId: string, rank: string): Promise<Point | null> {
    const bonusMap: { [key: string]: number } = {
      bronze: 100,
      silver: 300,
      gold: 500,
      platinum: 1000,
    }

    const bonus = bonusMap[rank.toLowerCase()]
    if (!bonus) return null

    return this.addPoints(userId, bonus, `${rank}ランク達成ボーナス`)
  },
}
