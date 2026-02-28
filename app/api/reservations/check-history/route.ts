import { NextRequest, NextResponse } from 'next/server'

import { setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

type TypeHistory = {
  count: number
  lastDate: string | null // ISO string of last completed reservation date
}

/**
 * 顧客のメールまたは電話番号で過去予約を検索し、
 * サービスタイプごとの予約回数と最終施術日を返す
 * 
 * 判定ロジック:
 * - count=0 → 1回目（キャンペーン価格）
 * - count=1 → 2回目（2回目価格）
 * - count>=2 → リタッチ（最終施術日からの経過で3ヶ月/6ヶ月価格）
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim()
  const phone = request.nextUrl.searchParams.get('phone')?.trim()

  if (!email && !phone) {
    return setCorsHeaders(
      NextResponse.json({ success: true, history: {} }),
    )
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ success: true, history: {} }),
    )
  }

  try {
    const completedStatuses = ['confirmed', 'completed']
    // docId → { type, date } で重複排除
    const seen = new Map<string, { type: string; date: string | null }>()

    for (const status of completedStatuses) {
      const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = []

      if (email) {
        queries.push(
          db.collection('reservations')
            .where('customerEmail', '==', email)
            .where('status', '==', status)
            .get(),
        )
      }
      if (phone) {
        queries.push(
          db.collection('reservations')
            .where('customerPhone', '==', phone)
            .where('status', '==', status)
            .get(),
        )
      }

      const results = await Promise.all(queries)
      for (const snap of results) {
        for (const doc of snap.docs) {
          if (seen.has(doc.id)) continue
          const data = doc.data()
          const type = data.serviceType as string
          if (!type) continue

          let dateStr: string | null = null
          const d = data.date ?? data.reservationDate
          if (typeof d === 'string') {
            dateStr = d
          } else if (d?.toDate) {
            dateStr = d.toDate().toISOString()
          }

          seen.set(doc.id, { type, date: dateStr })
        }
      }
    }

    // サービスタイプごとに集計
    const history: Record<string, TypeHistory> = {}
    for (const { type, date } of seen.values()) {
      if (!history[type]) {
        history[type] = { count: 0, lastDate: null }
      }
      history[type].count += 1
      if (date && (!history[type].lastDate || date > history[type].lastDate)) {
        history[type].lastDate = date
      }
    }

    return setCorsHeaders(
      NextResponse.json({ success: true, history }),
    )
  } catch (error) {
    console.error('check-history error:', error)
    return setCorsHeaders(
      NextResponse.json({ success: true, history: {} }),
    )
  }
}
