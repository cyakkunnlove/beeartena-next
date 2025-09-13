import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { cacheService } from '@/lib/api/cache'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    // キャッシュから取得を試みる（15分間有効）
    const cacheKey = `availability:${year}-${String(month).padStart(2, '0')}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return NextResponse.json({ availability: cached, cached: true })
    }

    const db = admin.firestore()

    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    // 指定月の予約を取得
    const reservationsSnapshot = await db.collection('reservations')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .where('status', 'in', ['pending', 'confirmed'])
      .get()

    // 予約されている日付と時間帯を集計
    const reservedSlots = new Map<string, Set<string>>()

    reservationsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const date = data.date
      const time = data.time

      if (!reservedSlots.has(date)) {
        reservedSlots.set(date, new Set())
      }
      reservedSlots.get(date)!.add(time)
    })

    // 各日の利用可能状況を判定
    const availability: { [key: string]: boolean } = {}
    const daysInMonth = endDate.getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(year, month - 1, day)

      // 過去の日付は利用不可
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today) {
        availability[dateStr] = false
        continue
      }

      // 日曜日は定休日
      if (date.getDay() === 0) {
        availability[dateStr] = false
        continue
      }

      // 曜日に応じた営業時間枠数を設定
      let maxSlotsPerDay: number
      if (date.getDay() === 3) {
        // 水曜日は延長営業（9:00-20:00、11枠）
        maxSlotsPerDay = 11
      } else {
        // その他の曜日は通常営業（10:00-19:00、9枠）
        maxSlotsPerDay = 9
      }

      // 予約済みスロット数を確認
      const reservedCount = reservedSlots.get(dateStr)?.size || 0

      // 空きスロットがあれば利用可能
      availability[dateStr] = reservedCount < maxSlotsPerDay
    }

    // キャッシュに保存（15分間）
    await cacheService.set(cacheKey, availability, 900)

    return NextResponse.json({ availability })
  } catch (error: any) {
    console.error('Failed to fetch availability:', error)
    return NextResponse.json(
      { availability: {} },  // エラー時も空のavailabilityオブジェクトを返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}