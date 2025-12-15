import { createHmac } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin'
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

const fetchLineMessageContent = async (
  messageId: string,
  accessToken: string,
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  try {
    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      logger.warn('LINE message content fetch failed', { messageId, status: response.status })
      return null
    }

    const contentType = (response.headers.get('content-type') ?? 'application/octet-stream').trim()
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch (error) {
    logger.warn('LINE message content fetch error', { messageId, error: getErrorMessage(error) })
    return null
  }
}

const inferExtension = (contentType: string, messageType: string): string => {
  const normalized = contentType.toLowerCase()
  if (messageType === 'image') {
    if (normalized.includes('png')) return 'png'
    if (normalized.includes('gif')) return 'gif'
    if (normalized.includes('webp')) return 'webp'
    if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
    return 'jpg'
  }
  if (messageType === 'video') {
    if (normalized.includes('mp4')) return 'mp4'
    if (normalized.includes('quicktime')) return 'mov'
    return 'mp4'
  }
  return 'bin'
}

const uploadLineMedia = async (params: {
  userId: string
  messageId: string
  messageType: string
  buffer: Buffer
  contentType: string
}): Promise<{ mediaPath: string; mediaContentType: string; mediaSize: number; mediaFileName: string } | null> => {
  const storage = getAdminStorage()
  if (!storage) return null

  const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '').trim()
  const bucket = storageBucket ? storage.bucket(storageBucket) : storage.bucket()

  const ext = inferExtension(params.contentType, params.messageType)
  const mediaFileName = `${params.messageId}.${ext}`
  const mediaPath = `line-media/${params.userId}/${mediaFileName}`

  try {
    await bucket.file(mediaPath).save(params.buffer, {
      resumable: false,
      contentType: params.contentType,
      metadata: {
        cacheControl: 'private, max-age=3600',
      },
    })

    return {
      mediaPath,
      mediaContentType: params.contentType,
      mediaSize: params.buffer.length,
      mediaFileName,
    }
  } catch (error) {
    logger.error('LINE media upload failed', { mediaPath, error: getErrorMessage(error) })
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

        let mediaFields: Record<string, unknown> = {}
        try {
          const existing = await messageRef.get()
          const canFetchMedia =
            !existing.exists &&
            Boolean(accessToken) &&
            (messageType === 'image' || messageType === 'video')

          if (canFetchMedia) {
            const content = await fetchLineMessageContent(messageId, accessToken)
            if (content) {
              const uploaded = await uploadLineMedia({
                userId,
                messageId,
                messageType,
                buffer: content.buffer,
                contentType: content.contentType,
              })
              if (uploaded) {
                mediaFields = uploaded
              }
            }
          }
        } catch (error) {
          logger.warn('LINE media prefetch failed', { userId, messageId, error: getErrorMessage(error) })
        }

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
                ...mediaFields,
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
