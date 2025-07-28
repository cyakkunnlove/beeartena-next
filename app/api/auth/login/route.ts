import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth/authService'
import { generateToken } from '@/lib/api/jwt'
import {
  errorResponse,
  successResponse,
  validateRequestBody,
  rateLimit,
  setCorsHeaders,
} from '@/lib/api/middleware'

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = rateLimit(request, 5, 60000) // 1分間に5回まで
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse)

  // リクエストボディの検証
  const { data, error } = await validateRequestBody<{ email: string; password: string }>(request, [
    'email',
    'password',
  ])
  if (error) return setCorsHeaders(error)

  try {
    // ログイン処理
    const user = await authService.login(data.email, data.password)

    // JWTトークン生成
    const token = await generateToken(user)

    return setCorsHeaders(
      successResponse({
        user,
        token,
      }),
    )
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ログインに失敗しました', 401))
  }
}
