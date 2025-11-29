import { NextRequest, NextResponse } from 'next/server'

import { reservationService as coreReservationService } from '@/lib/reservationService'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // 予約設定と既存予約を踏まえた空き枠を算出
    const timeSlots = await coreReservationService.getTimeSlotsForDate(date)

    // 予約一覧（編集モーダル等の互換用）
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    const reservations = await firebaseReservationService.getReservationsByDate(dateObj)

    const settings = coreReservationService.getSettings()
    const blocked = settings.blockedDates?.includes(date) || false

    return NextResponse.json({ timeSlots, reservations, blocked })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { timeSlots: [], reservations: [], blocked: false },  // エラー時も空の配列を返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}
