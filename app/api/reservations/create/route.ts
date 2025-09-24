import { NextRequest, NextResponse } from 'next/server'
import admin, { getAdminDb, isAdminInitialized } from '@/lib/firebase/admin'
import { emailService } from '@/lib/email/emailService'

export async function POST(request: NextRequest) {
  try {

    const data = await request.json()

    if (!isAdminInitialized) {
      return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 503 })
    }

    const db = getAdminDb()
    if (!db) {
      return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 503 })
    }

    // フロントエンドから送信されたcustomerEmailを使用
    const customerEmail = data.customerEmail
    if (!customerEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // ユーザー情報取得（Admin SDKなので権限制限なし）
    const usersSnapshot = await db.collection('users')
      .where('email', '==', customerEmail)
      .limit(1)
      .get()

    let userData = null
    let userId = null

    if (!usersSnapshot.empty) {
      // 登録済みユーザーの場合
      userData = usersSnapshot.docs[0].data()
      userId = usersSnapshot.docs[0].id
    }

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

      // 2. 誕生日ポイント確認・付与（登録済みユーザーのみ）
      if (userId && userData) {
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
      }

      // 3. ポイント使用処理（登録済みユーザーのみ）
      if (userId && data.pointsUsed && data.pointsUsed > 0) {
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

      return { reservationId: reservationRef.id, reservation: data }
    })

    // メール送信処理
    try {
      // 予約データの取得（表示用）
      const createdReservation = {
        id: result.reservationId,
        ...data,
        customerId: userId,
        status: 'pending' as const
      }

      // 顧客への確認メール送信
      if (customerEmail) {
        await emailService.sendReservationConfirmation(createdReservation, customerEmail)
      }

      // 管理者への通知メール送信
      await emailService.sendReservationNotificationToAdmin(createdReservation)
    } catch (emailError) {
      // メール送信失敗してもエラーにしない（予約は成功しているため）
      console.error('Email sending failed:', emailError)
    }

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