import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminStorage } from '@/lib/firebase/admin'
import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

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

const getStorageBucket = () => {
  const storage = getAdminStorage()
  if (!storage) return null

  const storageBucket = normalizeBucketName(
    (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim(),
  )
  try {
    return storageBucket ? storage.bucket(storageBucket) : storage.bucket()
  } catch {
    return null
  }
}

const inferExtension = (contentType: string): string => {
  const normalized = contentType.toLowerCase()
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('gif')) return 'gif'
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
  if (normalized.includes('mp4')) return 'mp4'
  if (normalized.includes('quicktime')) return 'mov'
  return 'bin'
}

const makeDownloadUrl = (bucketName: string, objectPath: string, token: string) => {
  const encodedPath = encodeURIComponent(objectPath)
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`
}

const pushLineMessage = async (accessToken: string, payload: Record<string, unknown>) => {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  if (!response.ok) {
    logger.warn('LINE push (media) failed', { status: response.status, body: text })
    throw new Error('LINE送信に失敗しました')
  }

  return text
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

  const bucket = getStorageBucket()
  const bucketName = normalizeBucketName(
    (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim(),
  )
  if (!bucket || !bucketName) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Firebase Storage is not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.' },
        { status: 503 },
      ),
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Invalid form data', details: getErrorMessage(error) }, { status: 400 }),
    )
  }

  const userId = toSafeString(form.get('userId'))
  const caption = toSafeString(form.get('caption'))
  const kind = toSafeString(form.get('kind')) // image | video
  const file = form.get('file')
  const preview = form.get('preview')

  if (!userId) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 }))
  }
  if (!(kind === 'image' || kind === 'video')) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'kind must be image or video' }, { status: 400 }))
  }
  if (!(file instanceof File)) {
    return setCorsHeaders(NextResponse.json({ success: false, error: 'file is required' }, { status: 400 }))
  }
  if (kind === 'video' && !(preview instanceof File)) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'preview is required for video' }, { status: 400 }),
    )
  }

  try {
    const now = Date.now()
    const safeUser = userId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileType = (file.type || 'application/octet-stream').trim()
    const fileExt = inferExtension(fileType)
    const fileToken = randomUUID()
    const filePath = `line-uploads/${safeUser}/${now}_${randomUUID()}.${fileExt}`

    await bucket.file(filePath).save(fileBuffer, {
      resumable: false,
      contentType: fileType,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: fileToken,
        },
        cacheControl: 'private, max-age=31536000',
      },
    })

    const fileUrl = makeDownloadUrl(bucketName, filePath, fileToken)

    let previewUrl: string | null = null
    if (kind === 'video' && preview instanceof File) {
      const previewBuffer = Buffer.from(await preview.arrayBuffer())
      const previewType = (preview.type || 'image/jpeg').trim()
      const previewExt = inferExtension(previewType)
      const previewToken = randomUUID()
      const previewPath = `line-uploads/${safeUser}/${now}_${randomUUID()}.${previewExt}`

      await bucket.file(previewPath).save(previewBuffer, {
        resumable: false,
        contentType: previewType,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: previewToken,
          },
          cacheControl: 'private, max-age=31536000',
        },
      })

      previewUrl = makeDownloadUrl(bucketName, previewPath, previewToken)
    }

    const messages: Array<Record<string, unknown>> = []
    if (kind === 'image') {
      messages.push({
        type: 'image',
        originalContentUrl: fileUrl,
        previewImageUrl: fileUrl,
      })
    } else {
      messages.push({
        type: 'video',
        originalContentUrl: fileUrl,
        previewImageUrl: previewUrl,
      })
    }
    if (caption) {
      messages.push({ type: 'text', text: caption })
    }

    await pushLineMessage(accessToken, { to: userId, messages })

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to send media.', details: getErrorMessage(error) },
        { status: 500 },
      ),
    )
  }
}
