import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

import { FieldPath, FieldValue } from 'firebase-admin/firestore'

type RawConversation = {
  userId?: unknown
  displayName?: unknown
  pictureUrl?: unknown
  statusMessage?: unknown
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

type RawMessage = {
  userId?: unknown
  direction?: unknown
  type?: unknown
  text?: unknown
  timestamp?: unknown
  createdAt?: unknown
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

const serializeConversation = (doc: { id: string; data: () => RawConversation | undefined }) => {
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

const serializeMessage = (doc: { id: string; data: () => RawMessage | undefined }) => {
  const data = (doc.data() ?? {}) as RawMessage
  const timestamp = toNumber(data.timestamp) ?? Date.now()
  const direction =
    typeof data.direction === 'string' && ['in', 'out'].includes(data.direction)
      ? data.direction
      : 'in'
  const type = typeof data.type === 'string' ? data.type : 'unknown'

  return {
    id: doc.id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    direction,
    type,
    text: typeof data.text === 'string' ? data.text : undefined,
    timestamp: new Date(timestamp).toISOString(),
  }
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
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

  const userId = decodeURIComponent(params.userId ?? '').trim()
  if (!userId) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 }))
  }

  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? 50) || 50))

  try {
    const conversationRef = db.collection('lineConversations').doc(userId)
    const conversationSnap = await conversationRef.get()

    if (!conversationSnap.exists) {
      return setCorsHeaders(NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 }))
    }

    let query = conversationRef
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(limit)

    if (cursor) {
      const cursorDoc = await conversationRef.collection('messages').doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    const snapshot = await query.get()
    const messages = snapshot.docs
      .map((doc) => serializeMessage(doc))
      .reverse()

    const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        conversation: serializeConversation(conversationSnap),
        messages,
        nextCursor,
      }),
    )
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to load LINE conversation.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
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

  const userId = decodeURIComponent(params.userId ?? '').trim()
  if (!userId) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 }))
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  }

  if (body.action === 'markRead') {
    updates.unreadCount = 0
  }

  if (typeof body.status === 'string' && ['open', 'pending', 'closed'].includes(body.status)) {
    updates.status = body.status
  }

  try {
    const conversationRef = db.collection('lineConversations').doc(userId)

    const hasCustomerIdField = Object.prototype.hasOwnProperty.call(body, 'customerId')
    if (hasCustomerIdField) {
      const customerIdValue = typeof body.customerId === 'string' ? body.customerId.trim() : ''

      if (!customerIdValue) {
        // unlink
        await db.runTransaction(async (tx) => {
          const convSnap = await tx.get(conversationRef)
          const existing = convSnap.exists ? (convSnap.data() ?? {}) : {}
          const existingCustomerId =
            typeof existing.customerId === 'string' ? existing.customerId : null

          tx.set(
            conversationRef,
            {
              ...updates,
              customerId: FieldValue.delete(),
              customerName: FieldValue.delete(),
              customerEmail: FieldValue.delete(),
              customerPhone: FieldValue.delete(),
            },
            { merge: true },
          )

          if (existingCustomerId) {
            const userRef = db.collection('users').doc(existingCustomerId)
            const userSnap = await tx.get(userRef)
            const userData = userSnap.exists ? (userSnap.data() ?? {}) : {}
            if (userSnap.exists && userData.lineUserId === userId) {
              tx.set(
                userRef,
                {
                  lineUserId: FieldValue.delete(),
                  lineLinkedAt: FieldValue.delete(),
                  updatedAt: new Date(),
                },
                { merge: true },
              )
            }
          }
        })
      } else {
        // link
        const customerRef = db.collection('users').doc(customerIdValue)

        await db.runTransaction(async (tx) => {
          const existingLinkQuery = db.collection('users').where('lineUserId', '==', userId).limit(1)
          const [customerSnap, existingLinkSnap] = await Promise.all([
            tx.get(customerRef),
            tx.get(existingLinkQuery),
          ])

          if (!customerSnap.exists) {
            throw new Error('顧客が見つかりません')
          }

          const customerData = customerSnap.data() ?? {}
          const role = typeof customerData.role === 'string' ? customerData.role.toLowerCase() : 'customer'
          if (role === 'admin' || Boolean(customerData.deleted)) {
            throw new Error('この顧客は紐付けできません')
          }

          if (
            typeof customerData.lineUserId === 'string' &&
            customerData.lineUserId.trim().length > 0 &&
            customerData.lineUserId !== userId
          ) {
            throw new Error('この顧客は既に別のLINEユーザーと紐付けされています')
          }

          if (!existingLinkSnap.empty) {
            const doc = existingLinkSnap.docs[0]
            if (doc && doc.id !== customerIdValue) {
              throw new Error('このLINEユーザーは既に別の顧客と紐付けされています')
            }
          }

          const customerName = typeof customerData.name === 'string' ? customerData.name : ''
          const customerEmail = typeof customerData.email === 'string' ? customerData.email : ''
          const customerPhone = typeof customerData.phone === 'string' ? customerData.phone : ''

          tx.set(
            conversationRef,
            {
              ...updates,
              customerId: customerIdValue,
              customerName,
              customerEmail,
              customerPhone,
            },
            { merge: true },
          )

          tx.set(
            customerRef,
            {
              lineUserId: userId,
              lineLinkedAt: new Date(),
              updatedAt: new Date(),
            },
            { merge: true },
          )
        })
      }
    } else {
      await conversationRef.set(updates, { merge: true })
    }

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update LINE conversation.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}
