import { pointService } from '@/lib/firebase/points'
import { userService } from '@/lib/firebase/users'
import { mockPointService, mockUserService } from '@/lib/mock/mockFirebase'
import { logger } from '@/lib/utils/logger'

const BIRTHDAY_POINTS = 1000

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

class BirthdayPointsService {
  /**
   * 誕生日ポイントをチェックして付与
   */
  async checkAndGrantBirthdayPoints(userId: string): Promise<boolean> {
    try {
      // クライアントサイドの場合はAPIを使用
      if (typeof window !== 'undefined') {
        // クッキーから認証トークンを取得
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1]

        const response = await fetch('/api/points/birthday', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ userId }),
        })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            logger.debug('Birthday points API skipped due to auth status', { status: response.status })
          } else {
            logger.warn('Birthday points API responded with non-OK status', {
              status: response.status,
            })
          }
          return false
        }

        const result = await response.json()
        return result.granted || false
      }

      // サーバーサイドの場合は直接処理
      const user = isFirebaseConfigured()
        ? await userService.getUser(userId)
        : await mockUserService.getUser(userId)

      if (!user || !user.birthday) {
        return false
      }

      // 誕生日をパース
      const today = new Date()
      const birthdayParts = user.birthday.split('-')
      const birthdayMonth = parseInt(birthdayParts[1])
      const birthdayDay = parseInt(birthdayParts[2])

      // 今日が誕生日かチェック
      const isBirthday = today.getMonth() + 1 === birthdayMonth && today.getDate() === birthdayDay

      if (!isBirthday) {
        return false
      }

      // 今年すでにポイントを付与したかチェック
      const currentYear = today.getFullYear()
      if (user.lastBirthdayPointsYear === currentYear) {
        return false
      }

      // ポイントを付与
      if (isFirebaseConfigured()) {
        await pointService.addPoints(
          userId,
          BIRTHDAY_POINTS,
          `お誕生日おめでとうございます！特別ポイント`,
        )
      } else {
        await mockPointService.addPoints(
          userId,
          BIRTHDAY_POINTS,
          `お誕生日おめでとうございます！特別ポイント`,
        )
      }

      // lastBirthdayPointsYearを更新
      if (isFirebaseConfigured()) {
        await userService.updateUser(userId, {
          lastBirthdayPointsYear: currentYear,
        })
      } else {
        await mockUserService.updateUser(userId, {
          lastBirthdayPointsYear: currentYear,
        })
      }

      return true
    } catch (error) {
      logger.error('Birthday points grant error', { error })
      return false
    }
  }

  /**
   * 全ユーザーの誕生日をチェック（バッチ処理用）
   */
  async checkAllUsersBirthdays(): Promise<{
    checked: number
    granted: number
    errors: string[]
  }> {
    const results = {
      checked: 0,
      granted: 0,
      errors: [] as string[],
    }

    try {
      // 全ユーザーを取得
      const users = isFirebaseConfigured()
        ? await userService.getAllUsers()
        : await mockUserService.getAllUsers()

      // 各ユーザーをチェック
      for (const user of users) {
        results.checked++

        try {
          const granted = await this.checkAndGrantBirthdayPoints(user.id)
          if (granted) {
            results.granted++
          }
        } catch (error) {
          results.errors.push(`User ${user.id}: ${error}`)
        }
      }

      return results
    } catch (error) {
      logger.error('Birthday batch process error', { error })
      throw error
    }
  }

  /**
   * 特定の日付での誕生日チェック（テスト用）
   */
  async checkBirthdayForDate(userId: string, testDate: Date): Promise<boolean> {
    try {
      const user = isFirebaseConfigured()
        ? await userService.getUser(userId)
        : await mockUserService.getUser(userId)

      if (!user || !user.birthday) {
        return false
      }

      const birthdayParts = user.birthday.split('-')
      const birthdayMonth = parseInt(birthdayParts[1])
      const birthdayDay = parseInt(birthdayParts[2])

      return testDate.getMonth() + 1 === birthdayMonth && testDate.getDate() === birthdayDay
    } catch (error) {
      logger.warn('Birthday check error', { error })
      return false
    }
  }
}

export const birthdayPointsService = new BirthdayPointsService()
