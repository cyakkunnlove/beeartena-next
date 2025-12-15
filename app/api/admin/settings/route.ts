import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'
import { buildAuditDiff } from '@/lib/utils/auditDiff'
import { normalizeSettings, validateReservationSettings } from '@/lib/utils/reservationSettings'

const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOC_ID = 'reservation-settings'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json(
        { success: false, message: 'Firebase admin is not configured.' },
        { status: 503 },
      ),
    )
  }

  const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get()
  if (!doc.exists) {
    return setCorsHeaders(
      NextResponse.json({
        success: true,
        exists: false,
        settings: normalizeSettings(null),
      }),
    )
  }

  return setCorsHeaders(
    NextResponse.json({
      success: true,
      exists: true,
      settings: normalizeSettings(doc.data() ?? null),
    }),
  )
}

async function saveSettings(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const authUser = await verifyAuth(request)

  try {
    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, message: 'Firebase admin is not configured.' },
          { status: 503 },
        ),
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const resetToDefault = body.resetToDefault === true

    const docRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID)
    const snap = await docRef.get()
    const current = snap.exists ? snap.data() ?? {} : {}

    // 管理用アクションのみ（blockedDates/dateOverridesの一括更新など）は、
    // 現在の設定が不整合でも“復旧のために”実行できるようバリデーションをスキップする。
    // （例: slotDuration が営業時間より長い状態だと通常保存ができず、ブロック日も解除できなくなる）
    const actionKeys = Object.keys(body)
    const allowedActionKeys = new Set([
      'blockedDate',
      'block',
      'clearBlockedDates',
      'clearDateOverrides',
    ])
    const isActionOnlyRequest =
      !resetToDefault &&
      actionKeys.length > 0 &&
      actionKeys.every((key) => allowedActionKeys.has(key))

    if (isActionOnlyRequest) {
      const beforeNormalized = normalizeSettings(current as any)

      let updatedBlockedDates: string[] | undefined
      let updatedDateOverrides: Record<string, unknown> | undefined

      // 操作を順に適用して最終状態を作る（競合時は後勝ち）
      if (body.clearBlockedDates === true) {
        updatedBlockedDates = []
      }
      if (body.clearDateOverrides === true) {
        updatedDateOverrides = {}
      }

      if (typeof body.blockedDate === 'string' && typeof body.block === 'boolean') {
        const base = Array.isArray(current.blockedDates)
          ? [...current.blockedDates]
          : []
        const target = body.blockedDate
        const exists = base.includes(target)
        if (body.block && !exists) base.push(target)
        if (!body.block && exists) base.splice(base.indexOf(target), 1)
        updatedBlockedDates = base
      }

      const partialUpdate: Record<string, unknown> = {
        updatedAt: new Date(),
      }
      const afterSource: Record<string, unknown> = { ...(current as any) }
      if (updatedBlockedDates) {
        partialUpdate.blockedDates = updatedBlockedDates
        afterSource.blockedDates = updatedBlockedDates
      }
      if (updatedDateOverrides) {
        partialUpdate.dateOverrides = updatedDateOverrides
        afterSource.dateOverrides = updatedDateOverrides
      }

      const afterNormalized = normalizeSettings(afterSource as any)
      const changes = buildAuditDiff(beforeNormalized, afterNormalized)

      await docRef.set(partialUpdate, { merge: true })

      if (authUser) {
        void recordAdminAuditEvent({
          actorUserId: authUser.userId,
          actorEmail: authUser.email,
          actorRole: authUser.role,
          method: request.method,
          path: request.nextUrl.pathname,
          action: 'settings.update',
          resourceType: SETTINGS_COLLECTION,
          resourceId: SETTINGS_DOC_ID,
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
          settings: afterNormalized,
        }),
      )
    }

    let nextSettings = resetToDefault
      ? normalizeSettings(null)
      : {
          ...current,
          ...body,
        }

    // blockedDate + block フラグでの追加/削除（部分更新）に対応
    if (!resetToDefault && typeof body.blockedDate === 'string' && typeof body.block === 'boolean') {
      const blockedDates: string[] = Array.isArray(current.blockedDates)
        ? [...current.blockedDates]
        : []

      const target = body.blockedDate
      const exists = blockedDates.includes(target)

      if (body.block && !exists) {
        blockedDates.push(target)
      }
      if (!body.block && exists) {
        blockedDates.splice(blockedDates.indexOf(target), 1)
      }

      nextSettings.blockedDates = blockedDates

      // 元の一時フィールドは保存しない
      delete (nextSettings as any).blockedDate
      delete (nextSettings as any).block
    }

    // 管理用アクション（保存はしない）
    if (body.clearBlockedDates === true) {
      nextSettings.blockedDates = []
      delete (nextSettings as any).clearBlockedDates
    }
    if (body.clearDateOverrides === true) {
      nextSettings.dateOverrides = {}
      delete (nextSettings as any).clearDateOverrides
    }
    if (body.resetToDefault === true) {
      delete (nextSettings as any).resetToDefault
    }

    const beforeNormalized = normalizeSettings(current as any)
    const normalized = normalizeSettings(nextSettings as any)
    const validation = validateReservationSettings(normalized)
    if (!validation.ok) {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: `設定が不正です: ${validation.errors.join(' / ')}`,
          },
          { status: 400 },
        ),
      )
    }
    const changes = buildAuditDiff(beforeNormalized, normalized)

    await docRef.set({ ...normalized, updatedAt: new Date() }, { merge: true })

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: resetToDefault ? 'settings.reset' : 'settings.update',
        resourceType: SETTINGS_COLLECTION,
        resourceId: SETTINGS_DOC_ID,
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
        settings: normalized,
      }),
    )
  } catch (error) {
    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'settings.update',
        resourceType: SETTINGS_COLLECTION,
        resourceId: SETTINGS_DOC_ID,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
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
      NextResponse.json(
        { success: false, message: '設定の保存に失敗しました。' },
        { status: 500 },
      ),
    )
  }
}

export async function PUT(request: NextRequest) {
  return saveSettings(request)
}

// 互換用（過去の実装やスクリプトからPOSTしていた場合に備える）
export async function POST(request: NextRequest) {
  return saveSettings(request)
}
