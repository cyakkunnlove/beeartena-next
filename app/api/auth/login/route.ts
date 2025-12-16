import { NextRequest, NextResponse } from 'next/server'

import { generateToken } from '@/lib/api/jwt'
import {
  errorResponse,
  getRequestId,
  successResponse,
  validateRequestBody,
  rateLimit,
  setCorsHeaders,
} from '@/lib/api/middleware'
import { authService } from '@/lib/auth/authService'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
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
    console.error('Login error:', error)
    
    // エラーメッセージを適切に返す
    let errorMessage = 'ログインに失敗しました'
    let statusCode = 401
    let errorCode = 'AUTH_FAILED'

    if (error instanceof Error) {
      // Firebase認証エラーの処理
      if (error.message.includes('メールアドレスまたはパスワードが正しくありません') ||
          error.message.includes('ユーザーが見つかりません') ||
          error.message.includes('パスワードが正しくありません') ||
          error.message.includes('認証情報が無効です')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません'
        errorCode = 'AUTH_INVALID_CREDENTIALS'
      } else if (error.message.includes('リクエストが多すぎます')) {
        errorMessage = 'リクエストが多すぎます。しばらくしてからお試しください'
        statusCode = 429
        errorCode = 'AUTH_RATE_LIMITED'
      } else if (error.message.includes('JWT_SECRET')) {
        errorMessage = 'サーバー設定エラーのためログインできません。管理者に連絡してください。'
        statusCode = 500
        errorCode = 'AUTH_SERVER_MISCONFIG'
      }
    }

    return setCorsHeaders(
      errorResponse(
        errorMessage,
        statusCode,
        errorCode,
        requestId ? { requestId } : {},
      ),
    )
  }
}
