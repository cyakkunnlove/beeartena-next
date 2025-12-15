import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { getErrorMessage } from '@/lib/types'

const COLLECTION = 'admin_audit_logs'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitRaw || '50') || 50, 1), 200)

  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) }))

    return setCorsHeaders(NextResponse.json({ success: true, logs }))
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: getErrorMessage(error) || '監査ログの取得に失敗しました' },
        { status: 500 },
      ),
    )
  }
}

