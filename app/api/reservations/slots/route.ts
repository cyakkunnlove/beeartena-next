import { NextRequest, NextResponse } from 'next/server'

import { errorResponse, successResponse, setCorsHeaders } from '@/lib/api/middleware'
import { reservationService } from '@/lib/reservationService'

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 予約可能な時間枠を取得（認証不要）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return setCorsHeaders(errorResponse('日付パラメータが必要です', 400))
  }

  try {
    const slots = await reservationService.getTimeSlotsForDate(date)
    return setCorsHeaders(successResponse(slots))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '時間枠の取得に失敗しました', 500))
  }
}
