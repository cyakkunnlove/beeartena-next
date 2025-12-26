import { createHmac, randomUUID } from 'crypto'

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

const shouldForwardLegacyNotification = (events: LineWebhookEvent[]): boolean => {
  return events.some((event) => {
    if (event?.type !== 'message' || !event.message) return false
    const message = event.message as LineWebhookMessage
    return typeof message.type === 'string' && message.type === 'text'
  })
}

const signForwardPayload = (rawBody: string, secret: string): string => {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

const forwardToLegacyWebhook = async (rawBody: string) => {
  const url = (process.env.LINE_WEBHOOK_FORWARD_URL ?? '').trim()
  if (!url) return

  const secret = (process.env.LINE_WEBHOOK_FORWARD_SECRET ?? '').trim()
  const controller = new AbortController()
  const timeoutMs = 8000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'beeartena-next/line-webhook-forward',
    }
    if (secret) {
      headers['x-beeartena-forward-signature'] = signForwardPayload(rawBody, secret)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: controller.signal,
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      logger.warn('LINE webhook forward got redirect response', {
        status: response.status,
        location: response.headers.get('location') ?? undefined,
      })
      return
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
    if (contentType.includes('text/html')) {
      logger.warn('LINE webhook forward returned HTML (likely auth / wrong URL)', { status: response.status })
      return
    }

    if (!response.ok) {
      logger.warn('LINE webhook forward failed', { status: response.status })
    }
  } catch (error) {
    logger.warn('LINE webhook forward error', { error: getErrorMessage(error) })
  } finally {
    clearTimeout(timer)
  }
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

const normalizeBucketName = (raw: string) => {
  let value = raw.trim()
  if (!value) return ''
  value = value.replace(/^gs:\/\//, '')
  value = value.replace(/^https?:\/\/storage\.googleapis\.com\//, '')
  if (value.includes('/')) {
    value = value.split('/')[0] ?? ''
  }
  return value.trim()
}

const getBucketCandidates = (raw: string): string[] => {
  const normalized = normalizeBucketName(raw)
  const candidates: string[] = []
  const push = (value: string) => {
    const v = value.trim()
    if (!v) return
    if (!candidates.includes(v)) candidates.push(v)
  }

  push(normalized)
  if (normalized.endsWith('.firebasestorage.app')) {
    push(normalized.replace(/\.firebasestorage\.app$/, '.appspot.com'))
  }
  if (normalized.endsWith('.appspot.com')) {
    push(normalized.replace(/\.appspot\.com$/, '.firebasestorage.app'))
  }

  return candidates
}

const isBucketNotFoundError = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('bucket does not exist') || normalized.includes('the specified bucket does not exist')
}

const uploadLineMedia = async (params: {
  userId: string
  messageId: string
  messageType: string
  buffer: Buffer
  contentType: string
}): Promise<{
  mediaPath: string
  mediaContentType: string
  mediaSize: number
  mediaFileName: string
  mediaToken: string
  mediaBucket: string
} | null> => {
  const storage = getAdminStorage()
  if (!storage) return null

  const storageBucketRaw = (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim()
  const candidates = getBucketCandidates(storageBucketRaw)
  if (candidates.length === 0) return null

  const ext = inferExtension(params.contentType, params.messageType)
  const mediaFileName = `${params.messageId}.${ext}`
  const mediaPath = `line-media/${params.userId}/${mediaFileName}`
  const mediaToken = randomUUID()

  try {
    let uploadedBucket: string | null = null
    let lastError: unknown = null
    for (const candidate of candidates) {
      try {
        const bucket = storage.bucket(candidate)
        await bucket.file(mediaPath).save(params.buffer, {
          resumable: false,
          contentType: params.contentType,
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: mediaToken,
            },
            cacheControl: 'private, max-age=3600',
          },
        })
        uploadedBucket = candidate
        break
      } catch (error) {
        lastError = error
        const message = getErrorMessage(error)
        if (isBucketNotFoundError(message)) {
          continue
        }
        throw error
      }
    }

    if (!uploadedBucket) {
      throw lastError ?? new Error('Failed to upload media to any bucket.')
    }

    return {
      mediaPath,
      mediaContentType: params.contentType,
      mediaSize: params.buffer.length,
      mediaFileName,
      mediaToken,
      mediaBucket: uploadedBucket,
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
  const shouldForwardLegacy = shouldForwardLegacyNotification(events)

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

    try {
      const conversationSnap = await conversationRef.get()
      const conversationData = conversationSnap.exists ? (conversationSnap.data() ?? {}) : {}
      const existingCustomerId =
        typeof conversationData.customerId === 'string' ? conversationData.customerId : ''

      if (!existingCustomerId) {
        const userSnap = await db.collection('users').where('lineUserId', '==', userId).limit(1).get()
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0]
          const userData = userDoc.data() ?? {}
          const customerName = typeof userData.name === 'string' ? userData.name : ''
          const customerEmail = typeof userData.email === 'string' ? userData.email : ''
          const customerPhone = typeof userData.phone === 'string' ? userData.phone : ''

          await conversationRef.set(
            {
              customerId: userDoc.id,
              customerName,
              customerEmail,
              customerPhone,
              updatedAt: Date.now(),
            },
            { merge: true },
          )
        }
      }
    } catch (error) {
      logger.warn('LINE auto-link failed', { userId, error: getErrorMessage(error) })
    }
  }

  if (shouldForwardLegacy) {
    await forwardToLegacyWebhook(rawBody)
  }

  return NextResponse.json({ ok: true, receivedAt: toIso(Date.now()) })
}
