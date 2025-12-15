import { NextRequest, NextResponse } from 'next/server'
import { setCacheHeaders, addFreshnessHeaders } from '@/lib/api/cache-strategy'
import { reservationService } from '@/lib/reservationService'
import { getAdminDb } from '@/lib/firebase/admin'
import type { ReservationSettings } from '@/lib/types'
import { normalizeSettings } from '@/lib/utils/reservationSettings'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')
    const mode = (searchParams.get('mode') || 'fast').toLowerCase()

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    const monthIndex = month - 1

    // フォールバック（高速）：営業時間のみで「選択可」を出す（満席判定は日付選択後のtimeSlotsで行う）
    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxFutureDate = new Date()
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 3)
    maxFutureDate.setHours(23, 59, 59, 999)

    let settings: ReservationSettings = normalizeSettings(null)
    const db = getAdminDb()
    if (db) {
      try {
        const snap = await Promise.race([
          db.collection('settings').doc('reservation-settings').get(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('settings timeout')), 700)),
        ])
        if (snap.exists) {
          settings = normalizeSettings((snap.data() as Partial<ReservationSettings>) ?? null)
        }
      } catch {
        // ignore; use default settings
      }
    }

    const fallbackAvailability: Record<string, boolean> = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dateObj = new Date(year, monthIndex, day)
      dateObj.setHours(0, 0, 0, 0)

      if (dateObj < today) {
        fallbackAvailability[dateStr] = false
        continue
      }
      if (dateObj > maxFutureDate) {
        fallbackAvailability[dateStr] = false
        continue
      }
      if (settings.blockedDates?.includes(dateStr)) {
        fallbackAvailability[dateStr] = false
        continue
      }

      const hours = settings.businessHours.find((h) => h.dayOfWeek === dateObj.getDay())
      fallbackAvailability[dateStr] = Boolean(hours?.isOpen && hours.open && hours.close)
    }

    let availability = fallbackAvailability
    let fallback = true
    let warning: string | undefined

    // 通常はfast（タイムアウト回避）で返す。厳密判定が必要なら mode=full を明示する。
    if (mode === 'full') {
      try {
        const availabilityMap = await Promise.race([
          reservationService.getMonthAvailability(year, monthIndex),
          new Promise<Map<string, boolean>>((_, reject) =>
            setTimeout(() => reject(new Error('availability timeout')), 2500),
          ),
        ])
        availability = Object.fromEntries(availabilityMap)
        fallback = false
      } catch {
        warning = '空き状況の集計に時間がかかるため、営業時間ベースの結果を返しました。日付選択後の時間枠で最終判定します。'
      }
    } else {
      warning = '営業時間ベースの結果です（満席判定は日付選択後の時間枠で行います）。'
    }

    let response = NextResponse.json({
      availability,
      fallback,
      warning,
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
