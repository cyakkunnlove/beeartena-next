import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const channelSecretConfigured = Boolean((process.env.LINE_CHANNEL_SECRET ?? '').trim())
  const accessTokenConfigured = Boolean((process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim())
  const firebaseAdminConfigured = Boolean(getAdminDb())

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
        receivingEnabled: channelSecretConfigured && firebaseAdminConfigured,
        sendingEnabled: accessTokenConfigured && firebaseAdminConfigured,
      },
      webhookUrl: `${baseUrl}/api/line/webhook`,
    }),
  )
}

