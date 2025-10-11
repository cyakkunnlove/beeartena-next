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

import { mockUserService } from '../mock/mockFirebase'
import { User, getErrorMessage } from '../types'

import { db } from './config'
import { getAdminDb } from './admin'
import { logger } from '@/lib/utils/logger'

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

export const userService = {
  // ユーザー作成
  async createUser(user: User): Promise<void> {
    if (!isFirebaseConfigured()) {
      // モックでは処理不要
      return
    }

    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        createdAt: Timestamp.fromDate(user.createdAt || new Date()),
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'ユーザーの作成に失敗しました')
    }
  },

  // ユーザー取得
  async getUser(id: string): Promise<User | null> {
    const start = Date.now()

    if (!isFirebaseConfigured()) {
      const mockResult = await mockUserService.getUser(id)
      logger.debug('users.get.mock', {
        userId: id,
        durationMs: Date.now() - start,
        found: Boolean(mockResult),
      })
      return mockResult
    }

    try {
      // サーバーサイドでは Admin SDK を使用（セキュリティルールをバイパス）
      const adminDb = getAdminDb()
      if (adminDb) {
        const docRef = await adminDb.collection('users').doc(id).get()
        if (!docRef.exists) {
          logger.debug('users.get.admin.miss', {
            userId: id,
            durationMs: Date.now() - start,
          })
          return null
        }

        const data = docRef.data()
        if (!data) {
          return null
        }

        const result = {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as User

        logger.debug('users.get.admin.hit', {
          userId: id,
          durationMs: Date.now() - start,
        })

        return result
      }

      // Admin SDK が利用できない場合は Client SDK にフォールバック
      const docRef = await getDoc(doc(db, 'users', id))
      if (!docRef.exists()) {
        logger.debug('users.get.firestore.miss', {
          userId: id,
          durationMs: Date.now() - start,
        })
        return null
      }

      const data = docRef.data()
      const result = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as User

      logger.debug('users.get.firestore.hit', {
        userId: id,
        durationMs: Date.now() - start,
      })

      return result
    } catch (error: unknown) {
      logger.error('users.get.firestore.error', {
        userId: id,
        durationMs: Date.now() - start,
        error,
      })
      throw new Error(getErrorMessage(error) || 'ユーザーの取得に失敗しました')
    }
  },

  // メールアドレスでユーザー検索
  async getUserByEmail(email: string): Promise<User | null> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return null
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', email))

      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) return null

      const data = querySnapshot.docs[0].data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as User
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'ユーザーの検索に失敗しました')
    }
  },

  // 全ユーザー取得（管理者用）
  async getAllUsers(): Promise<User[]> {
    if (!isFirebaseConfigured()) {
      return mockUserService.getAllUsers()
    }

    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as User
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'ユーザー一覧の取得に失敗しました')
    }
  },

  // ユーザー情報更新
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockUserService.updateUser(id, updates)
    }

    try {
      const updateData: Record<string, unknown> = { ...updates }
      const createdAtValue = updateData.createdAt

      if (createdAtValue instanceof Date) {
        updateData.createdAt = Timestamp.fromDate(createdAtValue)
      } else if (typeof createdAtValue === 'string') {
        const parsedDate = new Date(createdAtValue)
        if (!Number.isNaN(parsedDate.getTime())) {
          updateData.createdAt = Timestamp.fromDate(parsedDate)
        }
      } else if (
        createdAtValue &&
        typeof createdAtValue === 'object' &&
        'toDate' in createdAtValue &&
        typeof (createdAtValue as { toDate?: () => Date }).toDate === 'function'
      ) {
        const date = (createdAtValue as { toDate: () => Date }).toDate()
        updateData.createdAt = Timestamp.fromDate(date)
      }

      updateData.updatedAt = Timestamp.now()

      await updateDoc(doc(db, 'users', id), updateData)
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'ユーザー情報の更新に失敗しました')
    }
  },

  // ユーザーのランク計算
  calculateUserRank(totalSpent: number): string {
    if (totalSpent >= 500000) return 'Platinum'
    if (totalSpent >= 300000) return 'Gold'
    if (totalSpent >= 100000) return 'Silver'
    return 'Bronze'
  },

  // ユーザーの累計利用金額更新
  async updateTotalSpent(userId: string, amount: number): Promise<void> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません')
      }

      const currentTotal = userDoc.data().totalSpent || 0
      const newTotal = currentTotal + amount
      const newRank = this.calculateUserRank(newTotal)

      await updateDoc(doc(db, 'users', userId), {
        totalSpent: newTotal,
        rank: newRank,
        updatedAt: Timestamp.now(),
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || '累計利用金額の更新に失敗しました')
    }
  },

  // 管理者による顧客削除（論理削除）
  async deleteCustomerByAdmin(customerId: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('顧客削除機能は現在利用できません')
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', customerId))
      if (!userDoc.exists()) {
        throw new Error('顧客が見つかりません')
      }

      // 論理削除を実行
      await updateDoc(doc(db, 'users', customerId), {
        deleted: true,
        deletedAt: Timestamp.now(),
        deletedBy: 'admin',
        updatedAt: Timestamp.now(),
      })
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || '顧客の削除に失敗しました')
    }
  },
}
