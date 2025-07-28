import { NextRequest, NextResponse } from 'next/server'

import { errorResponse, successResponse, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'
import { userService } from '@/lib/firebase/users'

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  try {
    const user = await userService.getUser(authUser.userId)
    if (!user) {
      return setCorsHeaders(errorResponse('ユーザーが見つかりません', 404))
    }

    return setCorsHeaders(successResponse(user))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ユーザー情報の取得に失敗しました', 500))
  }
}
