import { randomUUID } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders, validateRequestBody, verifyAuth } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'
import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

type SendPayload = {
  userId: string
  text: string
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const authUser = await verifyAuth(request)

  const { data, error } = await validateRequestBody<SendPayload>(request, ['userId', 'text'])
  if (error) {
    return setCorsHeaders(error)
  }

  const userId = typeof data.userId === 'string' ? data.userId.trim() : ''
  const text = typeof data.text === 'string' ? data.text.trim() : ''

  if (!userId || !text) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'userId and text are required' }, { status: 400 }),
    )
  }

  const accessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim()
  if (!accessToken) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' },
        { status: 503 },
      ),
    )
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: 'Firebase admin is not configured.' }, { status: 503 }),
    )
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text }],
      }),
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      logger.warn('LINE push failed', { status: response.status, body: bodyText })
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'LINE送信に失敗しました', details: bodyText },
          { status: 502 },
        ),
      )
    }

    const now = Date.now()
    const conversationRef = db.collection('lineConversations').doc(userId)
    const messageId = `out_${now}_${randomUUID()}`

    await conversationRef.collection('messages').doc(messageId).set(
      {
        userId,
        direction: 'out',
        type: 'text',
        text,
        timestamp: now,
        createdAt: now,
      },
      { merge: true },
    )

    await conversationRef.set(
      {
        userId,
        updatedAt: now,
        lastMessageAt: now,
        lastMessageText: text,
      },
      { merge: true },
    )

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'line.send',
        resourceType: 'lineConversations',
        resourceId: userId,
        changes: [
          { path: 'messageId', after: messageId },
          { path: 'type', after: 'text' },
          { path: 'text', after: `len:${text.length}` },
        ],
        status: 'success',
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        ip:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        requestId:
          request.headers.get('x-vercel-id') ??
          request.headers.get('x-request-id') ??
          undefined,
      })
    }

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    logger.error('Admin LINE send failed', { userId, error: getErrorMessage(error) })
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to send LINE message.' },
        { status: 500 },
      ),
    )
  }
}
