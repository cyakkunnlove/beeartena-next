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

const isPermissionError = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('permission') || normalized.includes('forbidden') || normalized.includes('access denied')
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
  let storageBucket = normalizeBucketName(storageBucketRaw)
  let storageBucketConfigured = false
  let storageBucketVerified: boolean | null = null
  let storageBucketError: string | null = null
  try {
    const storage = getAdminStorage()
    if (storage) {
      // env未指定でも initializeApp(storageBucket=...) が設定されていれば storage.bucket() が利用可能
      if (!storageBucket) {
        try {
          const fallbackBucket = storage.bucket()
          if (fallbackBucket?.name) {
            storageBucket = normalizeBucketName(String(fallbackBucket.name))
          }
        } catch {
          // ignore
        }
      }

      // NOTE: bucket.getMetadata() は `storage.buckets.get` 権限が必要で、Object権限のみだと失敗することがあります。
      // ここでは「設定されているか」と「実際にアクセス可能か」を分けて返します。
      storageBucketConfigured = Boolean(storageBucket)

      if (storageBucket) {
        const bucket = storage.bucket(storageBucket)
        try {
          // object一覧やbucket metadataに依存しない軽い確認（存在確認は objects.get 権限が必要）
          await bucket.file('.__beeartena_storage_healthcheck').exists()
          storageBucketVerified = true
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          storageBucketVerified = false
          storageBucketError = message
          // 権限不足でも「設定ミス」とは限らないので、Configuredは維持
          if (!isPermissionError(message)) {
            // バケット名が間違っている等は、より致命的になりやすい
            storageBucketConfigured = true
          }
        }
      }
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
        storageBucketVerified,
        storageBucketError,
        receivingEnabled: channelSecretConfigured && firebaseAdminConfigured,
        sendingEnabled: accessTokenConfigured && firebaseAdminConfigured,
      },
      webhookUrl: `${baseUrl}/api/line/webhook`,
    }),
  )
}
