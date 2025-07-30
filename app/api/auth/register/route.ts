import { NextRequest, NextResponse } from 'next/server'

import { generateToken } from '@/lib/api/jwt'
import {
  errorResponse,
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
  // レート制限チェック
  const rateLimitResponse = rateLimit(request, 3, 60000) // 1分間に3回まで
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse)

  // リクエストボディの検証
  const { data, error } = await validateRequestBody<{
    email: string
    password: string
    name: string
    phone: string
    birthday?: string
  }>(request, ['email', 'password', 'name', 'phone'])

  if (error) return setCorsHeaders(error)

  // バリデーション
  if (!data.email.includes('@')) {
    return setCorsHeaders(errorResponse('有効なメールアドレスを入力してください'))
  }

  if (data.password.length < 8) {
    return setCorsHeaders(errorResponse('パスワードは8文字以上で設定してください'))
  }

  try {
    // 誕生日の検証（オプショナル）
    if (data.birthday) {
      const birthdayDate = new Date(data.birthday)
      if (isNaN(birthdayDate.getTime()) || birthdayDate > new Date()) {
        return setCorsHeaders(errorResponse('有効な生年月日を入力してください'))
      }
    }

    // 新規登録処理
    const user = await authService.register(
      data.email,
      data.password,
      data.name,
      data.phone,
      data.birthday,
    )

    // JWTトークン生成
    const token = await generateToken(user)

    return setCorsHeaders(
      successResponse(
        {
          user,
          token,
        },
        201,
      ),
    )
  } catch (error: any) {
    // 詳細なエラーログを出力
    console.error('Registration error details:', {
      error: error,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
      errorType: error?.constructor?.name,
      firebaseError: error?.customData,
      timestamp: new Date().toISOString(),
    })
    
    // エラーメッセージを適切に返す
    let errorMessage = '登録に失敗しました'
    let statusCode = 400

    if (error instanceof Error) {
      // Firebase認証エラーの処理
      if (error.message.includes('このメールアドレスは既に登録されています')) {
        errorMessage = error.message
      } else if (error.message.includes('パスワードは8文字以上で設定してください')) {
        errorMessage = error.message
      } else if (error.message.includes('有効なメールアドレスを入力してください')) {
        errorMessage = error.message
      } else if (error.message.includes('リクエストが多すぎます')) {
        errorMessage = 'リクエストが多すぎます。しばらくしてからお試しください'
        statusCode = 429
      } else if (error.message.includes('auth/')) {
        // Firebase Auth エラーコードを含む場合
        errorMessage = `認証エラー: ${error.message}`
        console.error('Firebase Auth Error:', error.message)
      } else {
        // その他のエラーの場合も、詳細をログに記録
        errorMessage = `登録エラー: ${error.message}`
      }
    }

    return setCorsHeaders(errorResponse(errorMessage, statusCode))
  }
}
