import { NextRequest, NextResponse } from 'next/server'

import { reservationService as coreReservationService } from '@/lib/reservationService'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const durationMinutesRaw = searchParams.get('durationMinutes')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // 予約設定と既存予約を踏まえた空き枠を算出
    const durationMinutesValue = durationMinutesRaw ? Number(durationMinutesRaw) : undefined
    const durationMinutes =
      Number.isFinite(durationMinutesValue ?? NaN) && (durationMinutesValue ?? 0) > 0
        ? (durationMinutesValue as number)
        : undefined

    const timeSlots = await coreReservationService.getTimeSlotsForDate(
      date,
      durationMinutes ? { durationMinutes } : undefined,
    )
    const settings = coreReservationService.getSettings()
    const blocked = settings.blockedDates?.includes(date) ?? false

    // 予約一覧（編集モーダル等の互換用）
    let reservations: unknown[] = []
    const authUser = await verifyAuth(request)
    const includeReservations = authUser?.role === 'admin'
    if (includeReservations) {
      const db = getAdminDb()
      if (db) {
        const snapshot = await db.collection('reservations').where('date', '==', date).get()
        reservations = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
          }
        })
      }
    }

    return NextResponse.json({ timeSlots, reservations, blocked })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { timeSlots: [], reservations: [], blocked: false },  // エラー時も空の配列を返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}
