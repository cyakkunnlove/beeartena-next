import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isAdminInitialized } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    if (!isAdminInitialized) {
      return NextResponse.json({ error: 'Firebase admin is not configured' }, { status: 503 })
    }

    const db = getAdminDb()

    // 設定を取得
    const settingsDoc = await db.collection('settings').doc('reservation').get()

    if (!settingsDoc.exists) {
      // デフォルト設定を返す
      return NextResponse.json({
        businessHours: [
          { dayOfWeek: 0, isOpen: false, open: '', close: '' }, // 日曜日
          { dayOfWeek: 1, isOpen: true, open: '10:00', close: '19:00' }, // 月曜日
          { dayOfWeek: 2, isOpen: true, open: '10:00', close: '19:00' }, // 火曜日
          { dayOfWeek: 3, isOpen: true, open: '10:00', close: '19:00' }, // 水曜日
          { dayOfWeek: 4, isOpen: true, open: '10:00', close: '19:00' }, // 木曜日
          { dayOfWeek: 5, isOpen: true, open: '10:00', close: '19:00' }, // 金曜日
          { dayOfWeek: 6, isOpen: true, open: '10:00', close: '17:00' }, // 土曜日
        ],
        slotDuration: 120, // 2時間
        bufferTime: 30, // 30分
        maxAdvanceBookingDays: 60,
        minAdvanceBookingHours: 24,
      })
    }

    const settings = settingsDoc.data()
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Settings fetch error:', error)
    // エラー時もデフォルト設定を返す
    return NextResponse.json({
      businessHours: [
        { dayOfWeek: 0, isOpen: false, open: '', close: '' },
        { dayOfWeek: 1, isOpen: true, open: '10:00', close: '19:00' },
        { dayOfWeek: 2, isOpen: true, open: '10:00', close: '19:00' },
        { dayOfWeek: 3, isOpen: true, open: '10:00', close: '19:00' },
        { dayOfWeek: 4, isOpen: true, open: '10:00', close: '19:00' },
        { dayOfWeek: 5, isOpen: true, open: '10:00', close: '19:00' },
        { dayOfWeek: 6, isOpen: true, open: '10:00', close: '17:00' },
      ],
      slotDuration: 120,
      bufferTime: 30,
      maxAdvanceBookingDays: 60,
      minAdvanceBookingHours: 24,
    })
  }
}