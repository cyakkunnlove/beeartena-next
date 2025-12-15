import { NextRequest, NextResponse } from 'next/server'

import { errorResponse, requireAdmin, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'
import { birthdayPointsService } from '@/lib/services/birthdayPoints'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const authUser = await verifyAuth(request)

  try {
    // 誕生日ポイント処理を実行
    const results = await birthdayPointsService.checkAllUsersBirthdays()

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'points.birthdayBatch',
        resourceType: 'points',
        resourceId: 'birthday',
        changes: [
          { path: 'checked', after: results.checked },
          { path: 'granted', after: results.granted },
          { path: 'errors', after: results.errors.length },
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

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: '誕生日ポイント処理が完了しました',
        results: {
          checked: results.checked,
          granted: results.granted,
          errors: results.errors.length,
          errorDetails: results.errors,
        },
      }),
    )
  } catch (error: any) {
    console.error('Birthday points batch error:', error)
    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: request.method,
        path: request.nextUrl.pathname,
        action: 'points.birthdayBatch',
        resourceType: 'points',
        resourceId: 'birthday',
        status: 'error',
        errorMessage: error?.message || '誕生日ポイント処理に失敗しました',
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
    return setCorsHeaders(errorResponse('誕生日ポイント処理に失敗しました', 500))
  }
}
