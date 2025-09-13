import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

const BIRTHDAY_POINTS = 1000

export async function POST(request: NextRequest) {
  try {
    // 認証トークン確認
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const db = admin.firestore()

    // ユーザー情報を取得
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ granted: false, reason: 'User not found' })
    }

    const userData = userDoc.data()!
    if (!userData.birthday) {
      return NextResponse.json({ granted: false, reason: 'No birthday set' })
    }

    // 誕生日をチェック
    const today = new Date()
    const birthdayParts = userData.birthday.split('-')
    const birthdayMonth = parseInt(birthdayParts[1])
    const birthdayDay = parseInt(birthdayParts[2])

    // 今日が誕生日かチェック
    const isBirthday = today.getMonth() + 1 === birthdayMonth && today.getDate() === birthdayDay

    if (!isBirthday) {
      return NextResponse.json({ granted: false, reason: 'Not birthday' })
    }

    // 今年すでにポイントを付与したかチェック
    const currentYear = today.getFullYear()
    if (userData.lastBirthdayPointsYear === currentYear) {
      return NextResponse.json({ granted: false, reason: 'Already granted this year' })
    }

    // トランザクションでポイント付与
    await db.runTransaction(async (transaction) => {
      // ポイント履歴を追加
      const pointRef = db.collection('points').doc()
      transaction.set(pointRef, {
        userId: userId,
        type: 'birthday',
        amount: BIRTHDAY_POINTS,
        year: currentYear,
        description: `${currentYear}年お誕生日ポイント`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // ユーザーのポイント残高と最終付与年を更新
      const userRef = db.collection('users').doc(userId)
      transaction.update(userRef, {
        points: admin.firestore.FieldValue.increment(BIRTHDAY_POINTS),
        lastBirthdayPointsYear: currentYear,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })

    return NextResponse.json({
      granted: true,
      points: BIRTHDAY_POINTS,
      message: 'Birthday points granted successfully'
    })

  } catch (error: any) {
    console.error('Birthday points API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to grant birthday points' },
      { status: 500 }
    )
  }
}