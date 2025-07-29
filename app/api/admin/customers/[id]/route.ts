import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  setCorsHeaders,
  verifyAuth,
} from '@/lib/api/middleware'
import { userService } from '@/lib/firebase/users'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 管理者による顧客削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  if (authUser.role !== 'admin') {
    return setCorsHeaders(errorResponse('管理者権限が必要です', 403))
  }

  try {
    await userService.deleteCustomerByAdmin(params.id)
    return setCorsHeaders(successResponse({ message: '顧客が削除されました' }))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '顧客の削除に失敗しました', 500))
  }
}