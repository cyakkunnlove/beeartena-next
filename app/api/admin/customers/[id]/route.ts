import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  setCorsHeaders,
  verifyAuth,
} from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'
import { buildAuditDiff } from '@/lib/utils/auditDiff'
import { userService } from '@/lib/firebase/users'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 管理者による顧客削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  if (authUser.role !== 'admin') {
    return setCorsHeaders(errorResponse('管理者権限が必要です', 403))
  }

  try {
    const db = getAdminDb()
    const beforeSnap = db ? await db.collection('users').doc(id).get() : null
    const beforeData = beforeSnap?.exists ? beforeSnap.data() ?? {} : {}

    await userService.deleteCustomerByAdmin(id)

    if (db) {
      const afterSnap = await db.collection('users').doc(id).get()
      const afterData = afterSnap.exists ? afterSnap.data() ?? {} : {}
      const changes = buildAuditDiff(beforeData, afterData)
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'customer.delete',
        resourceType: 'users',
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

    return setCorsHeaders(successResponse({ message: '顧客が削除されました' }))
  } catch (error: any) {
    void recordAdminAuditEvent({
      actorUserId: authUser.userId,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      method: request.method,
      path: request.nextUrl.pathname,
      action: 'customer.delete',
      resourceType: 'users',
      resourceId: id,
      status: 'error',
      errorMessage: error?.message || '顧客の削除に失敗しました',
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
    return setCorsHeaders(errorResponse(error.message || '顧客の削除に失敗しました', 500))
  }
}
