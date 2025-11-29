import { NextRequest, NextResponse } from 'next/server'
import { cache as cacheService } from '@/lib/api/cache'
import { CACHE_STRATEGY, setCacheHeaders, addFreshnessHeaders } from '@/lib/api/cache-strategy'
import { reservationService } from '@/lib/reservationService'

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

    const db = getAdminDb()

    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    // 各日の利用可能状況を判定（予約サービスのロジックと整合させるため、日ごとに実計算）
    const availability: { [key: string]: boolean } = {}
    const daysInMonth = endDate.getDate()

    console.log(`Calculating availability for ${year}-${month}:`, {
      daysInMonth,
      totalReservations,
      reservedSlots: Array.from(reservedSlots.entries()).map(([date, times]) => ({
        date,
        count: times.size,
        times: Array.from(times),
      })),
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

      // 予約サービスの実ロジックに合わせ、日次でスロット算出
      const slots = await reservationService.getTimeSlotsForDate(dateStr)
      availability[dateStr] = slots.some((slot) => slot.available)
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
