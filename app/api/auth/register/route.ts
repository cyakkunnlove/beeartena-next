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
  console.log('=== Register API called ===')
  
  // レート制限用にクローンを作成（ヘッダーのみ使用）
  const rateLimitResponse = rateLimit(request, 3, 60000)
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse)

  // リクエストボディを直接パース
  let body: any
  try {
    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)
    
    // リクエストボディのテキストを取得してデバッグ
    const text = await request.text()
    console.log('Raw request body:', text)
    
    if (!text) {
      console.error('Empty request body')
      return setCorsHeaders(errorResponse('リクエストボディが空です', 400))
    }
    
    try {
      body = JSON.parse(text)
      console.log('Successfully parsed JSON body:', body)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Failed to parse text:', text)
      return setCorsHeaders(errorResponse('不正なJSONフォーマットです', 400))
    }
  } catch (error) {
    console.error('Request body read error:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : 'unknown'
    })
    return setCorsHeaders(errorResponse('リクエストの読み取りに失敗しました', 400))
  }

  // 必須フィールドチェック
  const requiredFields = ['email', 'password', 'name', 'phone'] as const
  for (const field of requiredFields) {
    if (!(field in body)) {
      return setCorsHeaders(errorResponse(`必須フィールド '${field}' が不足しています`, 400))
    }
  }

  const data = body as {
    email: string
    password: string
    name: string
    phone: string
    birthday?: string
  }

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
