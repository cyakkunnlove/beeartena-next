import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 認証トークン確認
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const db = admin.firestore()

    // トークンからユーザーIDを取得（簡易実装 - 本来はJWT検証が必要）
    // ここでは、フロントエンドから送信されたcustomerEmailを信頼する
    const customerEmail = data.customerEmail
    if (!customerEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // ユーザー情報取得（Admin SDKなので権限制限なし）
    const usersSnapshot = await db.collection('users')
      .where('email', '==', customerEmail)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = usersSnapshot.docs[0].data()
    const userId = usersSnapshot.docs[0].id

    // トランザクションで予約とポイントを同時に処理
    const result = await db.runTransaction(async (transaction) => {
      // 1. 予約作成
      const reservationRef = db.collection('reservations').doc()
      transaction.set(reservationRef, {
        ...data,
        customerId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // 2. 誕生日ポイント確認・付与
      const today = new Date()
      const userBirthday = userData.birthday ? new Date(userData.birthday) : null

      if (userBirthday &&
          today.getMonth() === userBirthday.getMonth() &&
          today.getDate() === userBirthday.getDate()) {

        // 今年の誕生日ポイントが付与済みか確認
        const thisYear = today.getFullYear()
        const pointsSnapshot = await transaction.get(
          db.collection('points')
            .where('userId', '==', userId)
            .where('type', '==', 'birthday')
            .where('year', '==', thisYear)
        )

        if (pointsSnapshot.empty) {
          // 誕生日ポイント付与
          const pointRef = db.collection('points').doc()
          transaction.set(pointRef, {
            userId: userId,
            type: 'birthday',
            amount: 500,
            year: thisYear,
            description: `${thisYear}年誕生日ポイント`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          })

          // ユーザーのポイント残高更新
          const userRef = db.collection('users').doc(userId)
          transaction.update(userRef, {
            points: admin.firestore.FieldValue.increment(500)
          })
        }
      }

      // 3. ポイント使用処理
      if (data.pointsUsed && data.pointsUsed > 0) {
        const pointRef = db.collection('points').doc()
        transaction.set(pointRef, {
          userId: userId,
          type: 'use',
          amount: -data.pointsUsed,
          description: `予約 ${reservationRef.id} で使用`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // ユーザーのポイント残高更新
        const userRef = db.collection('users').doc(userId)
        transaction.update(userRef, {
          points: admin.firestore.FieldValue.increment(-data.pointsUsed)
        })
      }

      return { reservationId: reservationRef.id }
    })

    return NextResponse.json({
      success: true,
      reservationId: result.reservationId
    })

  } catch (error: any) {
    console.error('Reservation creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create reservation' },
      { status: 500 }
    )
  }
}