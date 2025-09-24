import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isAdminInitialized } from '@/lib/firebase/admin'
import { cache as cacheService } from '@/lib/api/cache'
import { CACHE_STRATEGY, setCacheHeaders, addFreshnessHeaders } from '@/lib/api/cache-strategy'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    // キャッシュキーを生成
    const cacheKey = `availability:${year}-${String(month).padStart(2, '0')}`

    // 極短TTL（5秒）でキャッシュチェック - availabilityはリアルタイム性が重要
    try {
      const cached = await Promise.race([
        cacheService.get(cacheKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 100)) // 100msでタイムアウト
      ])
      if (cached) {
        let response = NextResponse.json({
          availability: cached,
          cached: true,
          timestamp: new Date().toISOString()
        })
        response = setCacheHeaders(response, 'AVAILABILITY')
        response = addFreshnessHeaders(response)
        return response
      }
    } catch (cacheError) {
      console.log('Cache miss or timeout, fetching from DB')
    }

    if (!isAdminInitialized) {
      return NextResponse.json({ error: 'Firebase admin is not configured', availability: {} }, { status: 503 })
    }

    const db = getAdminDb()

    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    // 指定月の予約を取得（必要なフィールドのみ）
    const reservationsSnapshot = await db.collection('reservations')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .where('status', 'in', ['pending', 'confirmed'])
      .select('date', 'time') // パフォーマンス向上: 必要なフィールドのみ取得
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

    console.log(`Calculating availability for ${year}-${month}:`, {
      daysInMonth,
      totalReservations: reservationsSnapshot.docs.length,
      reservedSlots: Array.from(reservedSlots.entries()).map(([date, times]) => ({
        date,
        count: times.size,
        times: Array.from(times)
      }))
    })

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(year, month - 1, day)
      date.setHours(0, 0, 0, 0) // 時刻を00:00:00に設定して比較を正確に

      // 過去の日付は利用不可
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 予約可能期間の設定：今日から3ヶ月先まで
      const maxFutureDate = new Date()
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3)
      maxFutureDate.setHours(23, 59, 59, 999)

      if (date < today) {
        availability[dateStr] = false
        continue
      }

      // 3ヶ月以上先の日付も予約不可
      if (date > maxFutureDate) {
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
      const dayOfWeek = date.getDay()

      if (dayOfWeek === 0) {
        // 日曜日は定休日なので0枠
        maxSlotsPerDay = 0
      } else if (dayOfWeek === 3) {
        // 水曜日は日中営業（9:00-17:00、30分刻みで16枠）
        maxSlotsPerDay = 16
      } else if (dayOfWeek === 6) {
        // 土曜日は複数枠可能（夜間営業で4枠）
        maxSlotsPerDay = 4
      } else {
        // 平日（月、火、木、金）は1日1枠のみ
        // IMPORTANT: 平日は1件でも予約が入ったら、その日は他の予約不可
        maxSlotsPerDay = 1
      }

      // 予約済みスロット数を確認
      const reservedCount = reservedSlots.get(dateStr)?.size || 0

      // 平日の場合: 1件でも予約があれば利用不可
      // それ以外の曜日: 空きスロットがあれば利用可能
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && dayOfWeek !== 3) {
        // 月、火、木、金の平日は1件でも予約があれば不可
        availability[dateStr] = reservedCount === 0
      } else {
        // 水曜、土曜は通常通り空きスロットで判定
        availability[dateStr] = reservedCount < maxSlotsPerDay
      }
    }

    // キャッシュに保存（極短TTL: 5秒）
    await cacheService.set(cacheKey, availability, CACHE_STRATEGY.AVAILABILITY.TTL)

    // レスポンスにCache-Controlヘッダーを設定
    let response = NextResponse.json({
      availability,
      timestamp: new Date().toISOString()
    })
    response = setCacheHeaders(response, 'AVAILABILITY')
    response = addFreshnessHeaders(response)
    return response
  } catch (error: any) {
    console.error('Failed to fetch availability:', error)
    return NextResponse.json(
      { availability: {} },  // エラー時も空のavailabilityオブジェクトを返す
      { status: 200 }  // エラーでもステータス200で返してクライアント側の処理を継続
    )
  }
}