import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'
import { buildAuditDiff } from '@/lib/utils/auditDiff'

import type { Announcement } from '@/lib/types'
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore'

type RawAnnouncementRecord = {
  title?: unknown
  body?: unknown
  publishAt?: unknown
  expiresAt?: unknown
  isPinned?: unknown
  priority?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

const COLLECTION = 'announcements'

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const parsed = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(parsed.getTime()) ? null : parsed
    } catch {
      return null
    }
  }

  return null
}

const toIso = (value: unknown): string => {
  const parsed = toDate(value)
  if (!parsed) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

const toIsoOrNull = (value: unknown): string | undefined => {
  const parsed = toDate(value)
  if (!parsed) {
    return undefined
  }
  return parsed.toISOString()
}

const normalizeAnnouncement = (
  doc: QueryDocumentSnapshot<RawAnnouncementRecord>,
): Announcement => {
  const data = (doc.data() ?? {}) as RawAnnouncementRecord

  const publishAtIso = toIso(data.publishAt ?? new Date())
  const expiresAtIso = toIsoOrNull(data.expiresAt)

  return {
    id: doc.id,
    title: typeof data.title === 'string' ? data.title : '',
    body: typeof data.body === 'string' ? data.body : '',
    publishAt: publishAtIso,
    expiresAt: expiresAtIso,
    isPinned: Boolean(data.isPinned),
    priority: Number.isFinite(Number(data.priority)) ? Number(data.priority) : 0,
    createdAt: toIso(data.createdAt ?? publishAtIso),
    updatedAt: toIso(data.updatedAt ?? publishAtIso),
  }
}

const parsePriority = (value: unknown) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  return 0
}

const parseBoolean = (value: unknown) => {
  if (typeof value === 'string') {
    return value === 'true' || value === '1'
  }
  return Boolean(value)
}

const sanitizePayload = (payload: Partial<Announcement>) => {
  const now = new Date()
  const publishAtDate = toDate(payload.publishAt) ?? now
  const expiresAtDate = toDate(payload.expiresAt ?? null)

  return {
    title: (payload.title ?? '').toString().trim(),
    body: (payload.body ?? '').toString().trim(),
    publishAt: publishAtDate,
    expiresAt: expiresAtDate ?? null,
    isPinned: parseBoolean(payload.isPinned),
    priority: parsePriority(payload.priority),
  }
}

const ensureDb = (db: Firestore | null) => {
  if (!db) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: true,
          fallback: true,
          warning: 'Firebase admin is not configured; announcements could not be loaded.',
          announcements: [],
        },
        { status: 200 },
      ),
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  try {
    const database = getAdminDb()
    const fallback = ensureDb(database)
    if (fallback) {
      return fallback
    }

    const snapshot = await database!
      .collection(COLLECTION)
      .orderBy('publishAt', 'desc')
      .orderBy('priority', 'desc')
      .get()

    const announcements = snapshot.docs.map((doc) =>
      normalizeAnnouncement(doc as QueryDocumentSnapshot<RawAnnouncementRecord>),
    )

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        fallback: false,
        announcements,
      }),
    )
  } catch (error) {
    console.error('Admin announcements fetch error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせの取得に失敗しました。',
        },
        { status: 500 },
      ),
    )
  }
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  try {
    const authUser = await verifyAuth(request)
    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Firebase admin is not configured; announcements cannot be created.',
          },
          { status: 503 },
        ),
      )
    }

    const payload = (await request.json()) as Partial<Announcement>
    const sanitized = sanitizePayload(payload)

    if (!sanitized.title || !sanitized.body) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'タイトルと本文は必須です。',
          },
          { status: 400 },
        ),
      )
    }

    const now = new Date()
    const docRef = db.collection(COLLECTION).doc()
    await docRef.set({
      title: sanitized.title,
      body: sanitized.body,
      publishAt: sanitized.publishAt,
      expiresAt: sanitized.expiresAt ?? null,
      isPinned: sanitized.isPinned,
      priority: sanitized.priority,
      createdAt: now,
      updatedAt: now,
    })

    const snapshot = await docRef.get()
    const created = normalizeAnnouncement(
      snapshot as QueryDocumentSnapshot<RawAnnouncementRecord>,
    )

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'announcement.create',
        resourceType: COLLECTION,
        resourceId: docRef.id,
        changes: buildAuditDiff({}, created),
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

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        announcement: created,
      }),
    )
  } catch (error) {
    console.error('Admin announcement create error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせの作成に失敗しました。',
        },
        { status: 500 },
      ),
    )
  }
}

export async function PATCH(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせIDが指定されていません。',
        },
        { status: 400 },
      ),
    )
  }

  try {
    const authUser = await verifyAuth(request)
    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Firebase admin が設定されていないため、お知らせを更新できません。',
          },
          { status: 503 },
        ),
      )
    }

    const payload = (await request.json()) as Partial<Announcement>
    const sanitized = sanitizePayload(payload)

    const beforeSnap = await db.collection(COLLECTION).doc(id).get()
    const beforeData = beforeSnap.exists ? beforeSnap.data() ?? {} : {}

    await db.collection(COLLECTION).doc(id).set(
      {
        ...sanitized,
        updatedAt: new Date(),
      },
      { merge: true },
    )

    const snapshot = await db.collection(COLLECTION).doc(id).get()
    if (!snapshot.exists) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: '指定されたお知らせが見つかりません。',
          },
          { status: 404 },
        ),
      )
    }

    const updated = normalizeAnnouncement(snapshot as QueryDocumentSnapshot<RawAnnouncementRecord>)
    if (authUser) {
      const changes = buildAuditDiff(beforeData, updated)
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'announcement.update',
        resourceType: COLLECTION,
        resourceId: id,
        changes,
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

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        announcement: updated,
      }),
    )
  } catch (error) {
    console.error('Admin announcement update error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせの更新に失敗しました。',
        },
        { status: 500 },
      ),
    )
  }
}

export async function DELETE(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせIDが指定されていません。',
        },
        { status: 400 },
      ),
    )
  }

  try {
    const authUser = await verifyAuth(request)
    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Firebase admin が設定されていないため、お知らせを削除できません。',
          },
          { status: 503 },
        ),
      )
    }

    const beforeSnap = await db.collection(COLLECTION).doc(id).get()
    const beforeData = beforeSnap.exists ? beforeSnap.data() ?? {} : {}

    await db.collection(COLLECTION).doc(id).delete()

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'announcement.delete',
        resourceType: COLLECTION,
        resourceId: id,
        changes: buildAuditDiff(beforeData, {}),
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

    return setCorsHeaders(
      NextResponse.json({
        success: true,
      }),
    )
  } catch (error) {
    console.error('Admin announcement delete error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: 'お知らせの削除に失敗しました。',
        },
        { status: 500 },
      ),
    )
  }
}
