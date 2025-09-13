import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  validateRequestBody,
  setCorsHeaders,
  verifyAuth,
} from '@/lib/api/middleware'
import { reservationService } from '@/lib/reservationService'
import admin from '@/lib/firebase/admin'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 予約一覧取得
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  try {
    const db = admin.firestore()
    let reservations

    // 管理者は全予約を取得、一般ユーザーは自分の予約のみ
    if (authUser.role === 'admin') {
      const snapshot = await db.collection('reservations')
        .orderBy('date', 'desc')
        .get()
      
      reservations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }))
    } else {
      const snapshot = await db.collection('reservations')
        .where('customerId', '==', authUser.userId)
        .orderBy('date', 'desc')
        .get()
      
      reservations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }))
    }

    return setCorsHeaders(successResponse(reservations))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約一覧の取得に失敗しました', 500))
  }
}

// 予約作成
export async function POST(request: NextRequest) {
  // 認証はオプショナル（ログインユーザーの場合はcustomerIdを自動設定）
  const authUser = await verifyAuth(request)

  const { data, error } = await validateRequestBody<{
    serviceType: '2D' | '3D' | '4D'
    serviceName: string
    price: number
    date: string
    time: string
    customerName: string
    customerPhone: string
    customerEmail: string
    notes?: string
    finalPrice?: number
    pointsUsed?: number
  }>(request, [
    'serviceType',
    'serviceName',
    'price',
    'date',
    'time',
    'customerName',
    'customerPhone',
    'customerEmail',
  ])

  if (error) return setCorsHeaders(error)

  try {
    // 予約可能な時間枠かチェック
    const slots = await reservationService.getTimeSlotsForDate(data.date)
    const selectedSlot = slots.find((slot) => slot.time === data.time)

    if (!selectedSlot || !selectedSlot.available) {
      return setCorsHeaders(errorResponse('選択された時間枠は予約できません', 400))
    }

    // 予約作成
    const reservation = await reservationService.createReservation({
      ...data,
      customerId: authUser?.userId || null, // ログインしている場合のみcustomerIdを設定
      status: 'pending',
      updatedAt: new Date(),
    })

    return setCorsHeaders(successResponse(reservation, 201))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約の作成に失敗しました', 500))
  }
}
