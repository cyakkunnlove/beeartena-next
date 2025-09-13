import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    const db = admin.firestore()

    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    // 指定月の予約を取得（statusフィルタをクライアント側で実行）
    const reservationsSnapshot = await db.collection('reservations')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .get()

    // statusでフィルタリング（pending, confirmed のみ）
    const reservations = reservationsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(reservation =>
        reservation.status === 'pending' ||
        reservation.status === 'confirmed'
      )

    return NextResponse.json({ reservations })
  } catch (error: any) {
    console.error('Failed to fetch reservations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}