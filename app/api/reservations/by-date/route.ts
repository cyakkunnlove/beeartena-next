import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { cache as cacheService } from '@/lib/api/cache'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // キャッシュから取得を試みる（10分間有効）
    const cacheKey = `slots:${date}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return NextResponse.json({ timeSlots: cached, cached: true })
    }

    const db = getAdminDb()

    const reservedTimes = new Set<string>()

    if (db) {
      const reservationsSnapshot = await db
        .collection('reservations')
        .where('date', '==', date)
        .where('status', 'in', ['pending', 'confirmed'])
        .get()

      reservationsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.time) {
          reservedTimes.add(data.time)
        }
      })
    } else {
      console.warn('Firebase admin not configured; returning default time slots for by-date endpoint.')
    }

    // 曜日に応じて営業時間枠を設定
    const now = new Date()
    const [year, month, day] = date.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)

    let allTimeSlots: string[]

    // 水曜日は日中営業（9:00-17:00、30分刻み）
    if (selectedDate.getDay() === 3) {
      allTimeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30'
      ]
    } else if (selectedDate.getDay() === 0) {
      // 日曜日は定休日
      allTimeSlots = []
    } else {
      // その他の曜日は夜間営業
      // 平日（月、火、木、金）は1日1枠のみ
      if (selectedDate.getDay() >= 1 && selectedDate.getDay() <= 5 && selectedDate.getDay() !== 3) {
        // 眉施術は18:30から、頭皮施術は18:30または19:30から
        allTimeSlots = ['18:30', '19:00', '19:30']
      } else {
        // 土曜日は複数枠可能
        allTimeSlots = ['18:30', '19:00', '19:30', '20:00']
      }
    }

    // 各時間枠の利用可能状況をチェック
    const timeSlots = allTimeSlots.map(time => ({
      time,
      available: !reservedTimes.has(time)
    }))

    // 日曜日は定休日なので全ての時間枠を利用不可にする
    if (selectedDate.getDay() === 0) {
      timeSlots.forEach(slot => {
        slot.available = false
      })
    }

    // 今日の場合、現在時刻より前の時間枠は利用不可
    if (selectedDate.toDateString() === now.toDateString()) {
      const currentHour = now.getHours()
      timeSlots.forEach(slot => {
        const slotHour = parseInt(slot.time.split(':')[0])
        if (slotHour <= currentHour) {
          slot.available = false
        }
      })
    }

    // キャッシュに保存（10分間）
    await cacheService.set(cacheKey, timeSlots, 600)

    return NextResponse.json({ timeSlots })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { timeSlots: [] },  // エラー時も空の配列を返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}