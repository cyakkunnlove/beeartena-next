import { NextRequest, NextResponse } from 'next/server'
import admin, { getAdminDb, isAdminInitialized } from '@/lib/firebase/admin'
import { emailService } from '@/lib/email/emailService'
import { normalizeIntakeForm } from '@/lib/utils/intakeFormDefaults'

export async function POST(request: NextRequest) {
  try {

    const payload = await request.json()

    if (!isAdminInitialized) {
      return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 503 })
    }

    const db = getAdminDb()
    if (!db) {
      return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 503 })
    }

    const customerEmail = String(payload.customerEmail ?? '').trim().toLowerCase()
    if (!customerEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const requiredFields: Array<keyof typeof payload> = [
      'serviceName',
      'date',
      'time',
      'customerName',
      'customerPhone',
      'price',
      'totalPrice',
    ]

    for (const field of requiredFields) {
      if (!payload[field]) {
        return NextResponse.json({ error: `${String(field)} is required` }, { status: 400 })
      }
    }

    const price = Number(payload.price)
    const maintenancePrice = Number(payload.maintenancePrice ?? 0)
    const totalPrice = Number(payload.totalPrice)
    const pointsUsed = Number(payload.pointsUsed ?? 0)
    const finalPrice = Number(payload.finalPrice ?? totalPrice - pointsUsed)

    if ([price, maintenancePrice, totalPrice, pointsUsed, finalPrice].some((value) => Number.isNaN(value))) {
      return NextResponse.json({ error: 'Invalid numeric values detected' }, { status: 400 })
    }

    if (price < 0 || maintenancePrice < 0 || totalPrice < 0 || pointsUsed < 0 || finalPrice < 0) {
      return NextResponse.json({ error: 'Amounts must be positive values' }, { status: 400 })
    }

    const expectedTotal = price + maintenancePrice
    if (Math.abs(expectedTotal - totalPrice) > 0.5) {
      return NextResponse.json({ error: 'Total price does not match selected options' }, { status: 400 })
    }

    if (Math.abs(totalPrice - pointsUsed - finalPrice) > 0.5) {
      return NextResponse.json({ error: '最終金額の整合性が取れていません' }, { status: 400 })
    }

    if (pointsUsed > totalPrice) {
      return NextResponse.json({ error: 'ポイント使用数が利用金額を超えています' }, { status: 400 })
    }

    const reservationDateTime = new Date(`${payload.date}T${payload.time}:00`)
    if (Number.isNaN(reservationDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid reservation date or time' }, { status: 400 })
    }

    const now = new Date()
    if (reservationDateTime < now) {
      return NextResponse.json({ error: '過去の日時には予約できません' }, { status: 400 })
    }

    const intakeForm = normalizeIntakeForm(payload.intakeForm)

    const data = {
      ...payload,
      customerEmail,
      customerName: String(payload.customerName ?? '').trim(),
      customerPhone: String(payload.customerPhone ?? '').trim(),
      notes: payload.notes ? String(payload.notes).trim() : '',
      status: payload.status ?? 'pending',
      price,
      maintenancePrice,
      totalPrice,
      pointsUsed,
      finalPrice,
      intakeForm,
    }

    if (!data.customerName || !data.customerPhone) {
      return NextResponse.json({ error: '顧客情報が正しく入力されていません' }, { status: 400 })
    }

    // ユーザー情報取得（Admin SDKなので権限制限なし）
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', customerEmail)
      .limit(1)
      .get()

    let userData: Record<string, any> | null = null
    let userId: string | null = null

    if (!usersSnapshot.empty) {
      userData = usersSnapshot.docs[0].data()
      userId = usersSnapshot.docs[0].id
    }

    if (pointsUsed > 0 && !userId) {
      return NextResponse.json({ error: 'ポイントを利用するには会員登録が必要です' }, { status: 400 })
    }

    if (userData) {
      const availablePoints = Number(userData.points ?? 0)
      if (pointsUsed > availablePoints) {
        return NextResponse.json({ error: 'ポイント残高が不足しています' }, { status: 400 })
      }
    }

    // トランザクションで予約とポイントを同時に処理
    const result = await db.runTransaction(async (transaction) => {
      const conflictQuery = db
        .collection('reservations')
        .where('date', '==', data.date)
        .where('time', '==', data.time)
        .limit(1)

      const conflictSnapshot = await transaction.get(conflictQuery)
      if (!conflictSnapshot.empty) {
        const existing = conflictSnapshot.docs[0].data()
        const existingStatus = (existing.status as string | undefined) ?? 'pending'
        if (existingStatus !== 'cancelled') {
          throw new Error('RESERVATION_SLOT_UNAVAILABLE')
        }
      }

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
        status: (data.status ?? 'pending') as 'pending' | 'confirmed' | 'completed' | 'cancelled'
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

    if (error instanceof Error) {
      if (error.message === 'RESERVATION_SLOT_UNAVAILABLE') {
        return NextResponse.json({ error: '選択した日時は既に予約済みです' }, { status: 409 })
      }

      if (error.message.includes('FAILED_PRECONDITION') || error.message.includes('already exists')) {
        return NextResponse.json({ error: '選択した日時は既に予約済みです' }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to create reservation' },
      { status: 500 }
    )
  }
}