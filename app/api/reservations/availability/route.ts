import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
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

    const db = getAdminDb()

    // 月の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    const reservedSlots = new Map<string, Set<string>>()
    let totalReservations = 0
    let blockedDates: string[] = []
    let businessHours: Array<{
      dayOfWeek: number
      open: string
      close: string
      isOpen: boolean
      allowMultipleSlots?: boolean
      slotInterval?: number
      maxCapacityPerDay?: number
    }> = []
    const defaultBusinessHours = [
      { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 0 },
      { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
      { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
      { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true, allowMultipleSlots: true, slotInterval: 30, maxCapacityPerDay: 10 },
      { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
      { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
      { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
    ]

    if (db) {
      // 設定取得（blockedDates / businessHours）
      try {
        const settingsSnap = await db.collection('settings').doc('reservation-settings').get()
        if (settingsSnap.exists) {
          const data = settingsSnap.data() || {}
          blockedDates = Array.isArray(data.blockedDates) ? data.blockedDates : []
          if (Array.isArray(data.businessHours) && data.businessHours.length === 7) {
            businessHours = data.businessHours
          }
        }
      } catch (err) {
        console.warn('Failed to load reservation settings for availability; using defaults', err)
      }

      if (businessHours.length === 0) {
        businessHours = defaultBusinessHours
      }

      const reservationsSnapshot = await db
        .collection('reservations')
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .where('status', 'in', ['pending', 'confirmed'])
        .select('date', 'time')
        .get()

      reservationsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const date = data.date
        const time = data.time

        if (!reservedSlots.has(date)) {
          reservedSlots.set(date, new Set())
        }
        reservedSlots.get(date)!.add(time)
      })

      totalReservations = reservationsSnapshot.docs.length
    } else {
      console.warn('Firebase admin not configured; using empty reserved slots for availability response.')
    }

    // 各日の利用可能状況を判定
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

      // 設定に基づく定休日/ブロック日判定
      const dayOfWeek = date.getDay()
      const hours = businessHours[dayOfWeek] || defaultBusinessHours[dayOfWeek]

      if (!hours.isOpen || blockedDates.includes(dateStr)) {
        availability[dateStr] = false
        continue
      }

      // 設定に基づく最大受付数
      let maxSlotsPerDay = hours.maxCapacityPerDay ?? 1

      if (hours.allowMultipleSlots) {
        const [openH, openM] = hours.open.split(':').map(Number)
        const [closeH, closeM] = hours.close.split(':').map(Number)
        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM
        const interval = hours.slotInterval ?? 30
        const slotDuration = 120 // 2h施術前提（元設定では150だったがカレンダー判定用に保守的に2h）
        const slots = Math.max(
          1,
          Math.floor((closeMinutes - openMinutes - slotDuration) / interval) + 1,
        )
        // 明示指定があればそれを優先
        maxSlotsPerDay = hours.maxCapacityPerDay ?? slots
      }

      // 予約済みスロット数を確認
      const reservedCount = reservedSlots.get(dateStr)?.size || 0
      availability[dateStr] = reservedCount < maxSlotsPerDay
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
