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

export async function DELETE(request: NextRequest) {
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  const { data, error } = await validateRequestBody<{
    password: string
  }>(request, ['password'])

  if (error) return setCorsHeaders(error)

  try {
    await firebaseAuth.deleteAccount(data.password)
    return setCorsHeaders(successResponse({ message: 'アカウントが削除されました' }))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'アカウントの削除に失敗しました', 400))
  }
}