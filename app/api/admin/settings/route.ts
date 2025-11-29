import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOC_ID = 'reservation-settings'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get()
  if (!doc.exists) {
    return setCorsHeaders(NextResponse.json({ exists: false, settings: null }))
  }

  return setCorsHeaders(NextResponse.json({ exists: true, settings: doc.data() }))
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  const body = await request.json()

  await db
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOC_ID)
    .set({ ...body, updatedAt: new Date() }, { merge: true })

  return setCorsHeaders(NextResponse.json({ success: true }))
}
