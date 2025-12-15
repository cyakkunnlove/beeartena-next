import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin'
import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

type Payload = {
  userId: string
  messageId: string
}

const toSafeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

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

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null
  const maybe = error as { code?: unknown; status?: unknown }
  if (typeof maybe.code === 'string' && maybe.code) return maybe.code
  if (typeof maybe.status === 'number') return String(maybe.status)
  return null
}

const fetchLineMessageContent = async (
  messageId: string,
  accessToken: string,
): Promise<
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; status: number; body?: string }
> => {
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
      const text = await response.text().catch(() => '')
      logger.warn('LINE message content fetch failed (refetch)', { messageId, status: response.status, body: text })
      return { ok: false, status: response.status, body: text }
    }

    const contentType = (response.headers.get('content-type') ?? 'application/octet-stream').trim()
    const arrayBuffer = await response.arrayBuffer()
    return { ok: true, buffer: Buffer.from(arrayBuffer), contentType }
  } catch (error) {
    logger.warn('LINE message content fetch error (refetch)', { messageId, error: getErrorMessage(error) })
    return { ok: false, status: 0, body: getErrorMessage(error) }
  }
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const accessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim()
  if (!accessToken) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' }, { status: 503 }),
    )
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  const storage = getAdminStorage()
  const storageBucketRaw = (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim()
  const bucketCandidates = getBucketCandidates(storageBucketRaw)
  if (!storage || bucketCandidates.length === 0) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Firebase Storage is not configured. Set FIREBASE_ADMIN_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).' },
        { status: 503 },
      ),
    )
  }

  let payload: Payload
  try {
    payload = (await request.json()) as Payload
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Invalid JSON', details: getErrorMessage(error) }, { status: 400 }),
    )
  }

  const userId = toSafeString(payload.userId)
  const messageId = toSafeString(payload.messageId)
  if (!userId || !messageId) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'userId and messageId are required' }, { status: 400 }),
    )
  }

  const messageRef = db.collection('lineConversations').doc(userId).collection('messages').doc(messageId)
  const snap = await messageRef.get()
  if (!snap.exists) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 }))
  }

  const data = snap.data() ?? {}
  const type = typeof data.type === 'string' ? data.type : 'unknown'
  const direction = typeof data.direction === 'string' ? data.direction : 'in'
  const existingMediaPath = typeof data.mediaPath === 'string' ? data.mediaPath : ''

  if (!(type === 'image' || type === 'video')) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'This message is not media.' }, { status: 400 }))
  }
  if (direction !== 'in') {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'Only inbound media can be refetched.' }, { status: 400 }))
  }
  if (existingMediaPath) {
    return setCorsHeaders(NextResponse.json({ success: true, already: true }))
  }

  const content = await fetchLineMessageContent(messageId, accessToken)
  if (!content.ok) {
    const suffix = content.status ? ` (status=${content.status})` : ''
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: `Failed to fetch media content from LINE.${suffix}`,
          details: typeof content.body === 'string' && content.body.trim().length > 0 ? content.body.slice(0, 300) : undefined,
        },
        { status: 502 },
      ),
    )
  }

  const ext = inferExtension(content.contentType, type)
  const mediaFileName = `${messageId}.${ext}`
  const safeUser = userId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
  const mediaPath = `line-media/${safeUser}/${mediaFileName}`
  const mediaToken = randomUUID()

  try {
    let uploadedBucket: string | null = null
    let lastError: unknown = null
    for (const candidate of bucketCandidates) {
      try {
        const bucket = storage.bucket(candidate)
        await bucket.file(mediaPath).save(content.buffer, {
          resumable: false,
          contentType: content.contentType,
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

    await messageRef.set(
      {
        mediaPath,
        mediaContentType: content.contentType,
        mediaSize: content.buffer.length,
        mediaFileName,
        mediaToken,
        mediaBucket: uploadedBucket,
        mediaUpdatedAt: Date.now(),
      },
      { merge: true },
    )

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    const code = getErrorCode(error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: `Failed to upload media: ${getErrorMessage(error)}${code ? ` (code=${code})` : ''}`,
          details: getErrorMessage(error),
          errorCode: code,
          context: {
            storageBucket: normalizeBucketName(storageBucketRaw),
            bucketCandidates,
            mediaPath,
          },
        },
        { status: 500 },
      ),
    )
  }
}
