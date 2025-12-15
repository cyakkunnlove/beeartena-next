import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'

type RawConversation = {
  userId?: unknown
  displayName?: unknown
  pictureUrl?: unknown
  statusMessage?: unknown
  adminNote?: unknown
  customerId?: unknown
  customerName?: unknown
  customerEmail?: unknown
  customerPhone?: unknown
  lastMessageAt?: unknown
  lastMessageText?: unknown
  unreadCount?: unknown
  status?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const toIso = (value: unknown): string | undefined => {
  const numberValue = toNumber(value)
  if (numberValue !== null) {
    return new Date(numberValue).toISOString()
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in (value as { toDate?: () => Date }) &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    try {
      const parsed = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
    } catch {
      return undefined
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  }
  return undefined
}

const serializeConversation = (doc: QueryDocumentSnapshot<RawConversation>) => {
  const data = (doc.data() ?? {}) as RawConversation
  const userId = typeof data.userId === 'string' ? data.userId : doc.id
  const unread = toNumber(data.unreadCount) ?? 0

  const status =
    typeof data.status === 'string' && ['open', 'pending', 'closed'].includes(data.status)
      ? data.status
      : 'open'

  return {
    userId,
    displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
    pictureUrl: typeof data.pictureUrl === 'string' ? data.pictureUrl : undefined,
    statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : undefined,
    adminNote: typeof data.adminNote === 'string' ? data.adminNote : undefined,
    customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
    customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : undefined,
    customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : undefined,
    lastMessageAt: toIso(data.lastMessageAt),
    lastMessageText: typeof data.lastMessageText === 'string' ? data.lastMessageText : undefined,
    unreadCount: unread,
    status,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 30) || 30))

  try {
    let query = db.collection('lineConversations').orderBy('lastMessageAt', 'desc').limit(limit)

    if (cursor) {
      const cursorDoc = await db.collection('lineConversations').doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    const snapshot = await query.get()
    const conversations = snapshot.docs.map((doc) =>
      serializeConversation(doc as QueryDocumentSnapshot<RawConversation>),
    )

    const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        conversations,
        nextCursor,
      }),
    )
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to load LINE conversations.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}
