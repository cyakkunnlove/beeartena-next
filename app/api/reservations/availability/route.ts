import { NextRequest, NextResponse } from 'next/server'
import { setCacheHeaders, addFreshnessHeaders } from '@/lib/api/cache-strategy'
import { reservationService } from '@/lib/reservationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
    }

    // 月次でまとめて判定（内部で予約を一括ロードして計算）
    const monthIndex = month - 1
    const availabilityMap = await reservationService.getMonthAvailability(year, monthIndex)
    const availability = Object.fromEntries(availabilityMap)

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
