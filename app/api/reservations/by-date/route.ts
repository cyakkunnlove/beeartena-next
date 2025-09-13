import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const db = admin.firestore()

    // 指定日の予約を取得
    const reservationsSnapshot = await db.collection('reservations')
      .where('date', '==', date)
      .get()

    const reservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ reservations })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}