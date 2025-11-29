import { NextRequest, NextResponse } from 'next/server'

import { reservationService as coreReservationService } from '@/lib/reservationService'
import { reservationService as firebaseReservationService } from '@/lib/firebase/reservations'
import { settingsService } from '@/lib/firebase/settings'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // 最新設定をFirestoreから取得してブロック日を判定
    let blocked = false
    try {
      const latestSettings = await settingsService.getSettings()
      blocked = latestSettings?.blockedDates?.includes(date) ?? false
    } catch (err) {
      console.warn('Failed to fetch settings in by-date route, fallback to local settings', err)
      const fallbackSettings = coreReservationService.getSettings()
      blocked = fallbackSettings.blockedDates?.includes(date) ?? false
    }

    if (blocked) {
      return NextResponse.json({ timeSlots: [], reservations: [], blocked: true })
    }

    // 予約設定と既存予約を踏まえた空き枠を算出
    const timeSlots = await coreReservationService.getTimeSlotsForDate(date)

    // 予約一覧（編集モーダル等の互換用）
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    const reservations = await firebaseReservationService.getReservationsByDate(dateObj)

    return NextResponse.json({ timeSlots, reservations, blocked: false })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { timeSlots: [], reservations: [], blocked: false },  // エラー時も空の配列を返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}
