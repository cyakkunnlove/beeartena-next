import { NextRequest, NextResponse } from 'next/server'

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
      logger.warn('LINE message content fetch failed (refetch)', { messageId, status: response.status })
      return null
    }

    const contentType = (response.headers.get('content-type') ?? 'application/octet-stream').trim()
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch (error) {
    logger.warn('LINE message content fetch error (refetch)', { messageId, error: getErrorMessage(error) })
    return null
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
  const storageBucket = (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim()
  const bucket = storage ? (storageBucket ? storage.bucket(storageBucket) : storage.bucket()) : null
  if (!bucket) {
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
  if (!content) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Failed to fetch media content from LINE.' }, { status: 502 }),
    )
  }

  const ext = inferExtension(content.contentType, type)
  const mediaFileName = `${messageId}.${ext}`
  const safeUser = userId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
  const mediaPath = `line-media/${safeUser}/${mediaFileName}`

  try {
    await bucket.file(mediaPath).save(content.buffer, {
      resumable: false,
      contentType: content.contentType,
      metadata: {
        cacheControl: 'private, max-age=3600',
      },
    })

    await messageRef.set(
      {
        mediaPath,
        mediaContentType: content.contentType,
        mediaSize: content.buffer.length,
        mediaFileName,
        mediaUpdatedAt: Date.now(),
      },
      { merge: true },
    )

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Failed to upload media.', details: getErrorMessage(error) }, { status: 500 }),
    )
  }
}

