import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  validateRequestBody,
  setCorsHeaders,
  verifyAuth,
} from '@/lib/api/middleware'
import { firebaseAuth } from '@/lib/firebase/auth'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  const { data, error } = await validateRequestBody<{
    currentPassword: string
    newPassword: string
  }>(request, ['currentPassword', 'newPassword'])

  if (error) return setCorsHeaders(error)

  try {
    await firebaseAuth.changePassword(data.currentPassword, data.newPassword)
    return setCorsHeaders(successResponse({ message: 'パスワードが変更されました' }))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'パスワードの変更に失敗しました', 400))
  }
}