import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin'

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

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const channelSecretConfigured = Boolean((process.env.LINE_CHANNEL_SECRET ?? '').trim())
  const accessTokenConfigured = Boolean((process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim())
  const firebaseAdminConfigured = Boolean(getAdminDb())
  const storageBucketRaw = (process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim()
  const storageBucket = normalizeBucketName(storageBucketRaw)
  let storageBucketConfigured = false
  let storageBucketError: string | null = null
  try {
    const storage = getAdminStorage()
    if (storage && storageBucket) {
      const bucket = storage.bucket(storageBucket)
      await bucket.getMetadata()
      storageBucketConfigured = true
    }
  } catch (error) {
    storageBucketConfigured = false
    storageBucketError = error instanceof Error ? error.message : 'Storage bucket check failed'
  }

  const url = new URL(request.url)
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol
  const host = forwardedHost ?? url.host
  const baseUrl = `${protocol}//${host}`

  return setCorsHeaders(
    NextResponse.json({
      success: true,
      config: {
        channelSecretConfigured,
        accessTokenConfigured,
        firebaseAdminConfigured,
        storageBucketConfigured,
        storageBucket,
        storageBucketError,
        receivingEnabled: channelSecretConfigured && firebaseAdminConfigured,
        sendingEnabled: accessTokenConfigured && firebaseAdminConfigured,
      },
      webhookUrl: `${baseUrl}/api/line/webhook`,
    }),
  )
}
