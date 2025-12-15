import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { normalizeSettings } from '@/lib/utils/reservationSettings'

const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOC_ID = 'reservation-settings'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, message: 'Firebase admin is not configured.' },
        { status: 503 },
      ),
    )
  }

  const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get()
  if (!doc.exists) {
    return setCorsHeaders(
      NextResponse.json({
        success: true,
        exists: false,
        settings: normalizeSettings(null),
      }),
    )
  }

  return setCorsHeaders(
    NextResponse.json({
      success: true,
      exists: true,
      settings: normalizeSettings(doc.data() ?? null),
    }),
  )
}

async function saveSettings(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, message: 'Firebase admin is not configured.' },
        { status: 503 },
      ),
    )
  }

  const body = (await request.json()) as Record<string, unknown>

  const docRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID)
  const snap = await docRef.get()
  const current = snap.exists ? snap.data() ?? {} : {}

  let nextSettings = {
    ...current,
    ...body,
  }

  // blockedDate + block フラグでの追加/削除（部分更新）に対応
  if (typeof body.blockedDate === 'string' && typeof body.block === 'boolean') {
    const blockedDates: string[] = Array.isArray(current.blockedDates)
      ? [...current.blockedDates]
      : []

    const target = body.blockedDate
    const exists = blockedDates.includes(target)

    if (body.block && !exists) {
      blockedDates.push(target)
    }
    if (!body.block && exists) {
      blockedDates.splice(blockedDates.indexOf(target), 1)
    }

    nextSettings.blockedDates = blockedDates

    // 元の一時フィールドは保存しない
    delete (nextSettings as any).blockedDate
    delete (nextSettings as any).block
  }

  const normalized = normalizeSettings(nextSettings)
  await docRef.set({ ...normalized, updatedAt: new Date() }, { merge: true })

  return setCorsHeaders(
    NextResponse.json({
      success: true,
      settings: normalized,
    }),
  )
}

export async function PUT(request: NextRequest) {
  return saveSettings(request)
}

// 互換用（過去の実装やスクリプトからPOSTしていた場合に備える）
export async function POST(request: NextRequest) {
  return saveSettings(request)
}
