import { createHmac } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

type LineWebhookSource =
  | { type: 'user'; userId: string }
  | { type: 'group'; groupId: string; userId?: string }
  | { type: 'room'; roomId: string; userId?: string }

type LineWebhookMessage = {
  id: string
  type: string
  text?: string
}

type LineWebhookEvent = {
  type: string
  timestamp: number
  source: LineWebhookSource
  message?: LineWebhookMessage
}

type LineWebhookPayload = {
  destination?: string
  events?: LineWebhookEvent[]
}

const verifyLineSignature = (rawBody: string, signature: string, channelSecret: string): boolean => {
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  return signature === expected
}

const fetchLineProfile = async (
  userId: string,
  accessToken: string,
): Promise<{ displayName?: string; pictureUrl?: string; statusMessage?: string } | null> => {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Record<string, unknown>
    return {
      displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
      pictureUrl: typeof data.pictureUrl === 'string' ? data.pictureUrl : undefined,
      statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : undefined,
    }
  } catch (error) {
    logger.warn('LINE profile fetch failed', { userId, error: getErrorMessage(error) })
    return null
  }
}

const toIso = (ms: number): string => new Date(ms).toISOString()

export async function POST(request: NextRequest) {
  const channelSecret = (process.env.LINE_CHANNEL_SECRET ?? '').trim()
  const signature = (request.headers.get('x-line-signature') ?? '').trim()

  if (!channelSecret) {
    return NextResponse.json({ ok: false, error: 'LINE_CHANNEL_SECRET is not configured' }, { status: 503 })
  }

  if (!signature) {
    return NextResponse.json({ ok: false, error: 'Missing X-Line-Signature header' }, { status: 401 })
  }

  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch (error) {
    logger.warn('LINE webhook failed to read request body', { error: getErrorMessage(error) })
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
  }

  let payload: LineWebhookPayload | null = null
  try {
    payload = JSON.parse(rawBody) as LineWebhookPayload
  } catch (error) {
    logger.warn('LINE webhook invalid JSON', { error: getErrorMessage(error) })
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const events = Array.isArray(payload?.events) ? payload.events : []
  if (events.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const db = getAdminDb()
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Firebase admin is not configured' }, { status: 503 })
  }

  const accessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim()

  for (const event of events) {
    const source = event?.source
    if (!source || source.type !== 'user' || typeof source.userId !== 'string') {
      continue
    }

    const userId = source.userId
    const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : Date.now()
    const isMessageEvent = event.type === 'message' && event.message && typeof event.message.id === 'string'

    const conversationRef = db.collection('lineConversations').doc(userId)

    try {
      if (isMessageEvent) {
        const message = event.message as LineWebhookMessage
        const messageId = message.id
        const messageRef = conversationRef.collection('messages').doc(messageId)
        const messageType = typeof message.type === 'string' ? message.type : 'unknown'
        const text = typeof message.text === 'string' ? message.text : undefined

        await db.runTransaction(async (tx) => {
          const existing = await tx.get(messageRef)
          const convSnap = await tx.get(conversationRef)

          const prev = convSnap.exists ? (convSnap.data() ?? {}) : {}
          const prevLast = typeof prev.lastMessageAt === 'number' ? prev.lastMessageAt : 0

          const shouldUpdateLast = eventTimestamp >= prevLast
          const existingUnread =
            typeof prev.unreadCount === 'number' && Number.isFinite(prev.unreadCount) ? prev.unreadCount : 0

          if (!existing.exists) {
            tx.set(
              messageRef,
              {
                userId,
                direction: 'in',
                type: messageType,
                ...(text ? { text } : {}),
                timestamp: eventTimestamp,
                createdAt: Date.now(),
                raw: event,
              },
              { merge: true },
            )
          }

          tx.set(
            conversationRef,
            {
              userId,
              updatedAt: Date.now(),
              ...(prev.createdAt ? {} : { createdAt: Date.now() }),
              ...(shouldUpdateLast
                ? {
                    lastMessageAt: eventTimestamp,
                    lastMessageText: text ?? (messageType ? `[${messageType}]` : ''),
                  }
                : {}),
              unreadCount: existing.exists ? existingUnread : existingUnread + 1,
              status: prev.status ?? 'open',
            },
            { merge: true },
          )
        })
      } else {
        await conversationRef.set(
          {
            userId,
            updatedAt: Date.now(),
            createdAt: Date.now(),
          },
          { merge: true },
        )
      }
    } catch (error) {
      logger.error('LINE webhook Firestore write failed', {
        userId,
        error: getErrorMessage(error),
      })
      return NextResponse.json({ ok: false, error: 'Failed to store message' }, { status: 500 })
    }

    if (accessToken) {
      const profile = await fetchLineProfile(userId, accessToken)
      if (profile) {
        try {
          await conversationRef.set(
            {
              ...profile,
              profileUpdatedAt: Date.now(),
            },
            { merge: true },
          )
        } catch (error) {
          logger.warn('LINE profile store failed', { userId, error: getErrorMessage(error) })
        }
      }
    }
  }

  return NextResponse.json({ ok: true, receivedAt: toIso(Date.now()) })
}

