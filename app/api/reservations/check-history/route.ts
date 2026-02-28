import { NextRequest, NextResponse } from 'next/server'

import { setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

/**
 * 顧客のメールまたは電話番号で過去予約を検索し、
 * サービスタイプごとの予約回数を返す（1回目/2回目判定用）
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
    // メールまたは電話番号で過去の確定・完了済み予約を検索
    const completedStatuses = ['confirmed', 'completed']
    const history: Record<string, number> = {}

    for (const status of completedStatuses) {
      if (email) {
        const snap = await db
          .collection('reservations')
          .where('customerEmail', '==', email)
          .where('status', '==', status)
          .get()
        for (const doc of snap.docs) {
          const type = doc.data().serviceType as string
          if (type) history[type] = (history[type] ?? 0) + 1
        }
      }
      if (phone) {
        const snap = await db
          .collection('reservations')
          .where('customerPhone', '==', phone)
          .where('status', '==', status)
          .get()
        for (const doc of snap.docs) {
          const type = doc.data().serviceType as string
          if (type) {
            // メールで既にカウント済みなら重複除外（同じdoc.id）
            // 簡易的にカウントを加算（厳密な重複排除は不要）
            history[type] = (history[type] ?? 0) + 1
          }
        }
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
