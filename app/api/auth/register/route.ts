import { NextRequest, NextResponse } from 'next/server'

import { generateToken } from '@/lib/api/jwt'
import {
  errorResponse,
  getRequestId,
  rateLimit,
  setCorsHeaders,
  successResponse,
  validateRequestBody,
} from '@/lib/api/middleware'
import { authService } from '@/lib/auth/authService'

type Payload = {
  email: string
  password: string
  name: string
  phone: string
  birthday?: string
}

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  // 1分間に3回まで
  const rateLimitResponse = rateLimit(request, 3, 60000)
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse)

  const { data, error } = await validateRequestBody<Payload>(request, ['email', 'password', 'name', 'phone'])
  if (error) return setCorsHeaders(error)

  const email = String(data.email ?? '').trim().toLowerCase()
  const password = String(data.password ?? '')
  const name = String(data.name ?? '').trim()
  const phone = String(data.phone ?? '').trim()
  const birthday = typeof data.birthday === 'string' ? data.birthday : undefined

  if (!email.includes('@')) {
    return setCorsHeaders(errorResponse('有効なメールアドレスを入力してください', 400, 'AUTH_INVALID_EMAIL', requestId ? { requestId } : {}))
  }

  if (password.length < 8) {
    return setCorsHeaders(errorResponse('パスワードは8文字以上で設定してください', 400, 'AUTH_WEAK_PASSWORD', requestId ? { requestId } : {}))
  }

  if (!name || !phone) {
    return setCorsHeaders(errorResponse('必須項目が不足しています', 400, 'AUTH_INVALID_INPUT', requestId ? { requestId } : {}))
  }

  if (birthday) {
    const birthdayDate = new Date(birthday)
    if (Number.isNaN(birthdayDate.getTime()) || birthdayDate > new Date()) {
      return setCorsHeaders(errorResponse('有効な生年月日を入力してください', 400, 'AUTH_INVALID_BIRTHDAY', requestId ? { requestId } : {}))
    }
  }

  try {
    const user = await authService.register(email, password, name, phone, birthday)
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '登録に失敗しました'
    let statusCode = 400
    let errorCode = 'AUTH_REGISTER_FAILED'
    let errorMessage = '登録に失敗しました'

    if (message.includes('このメールアドレスは既に登録されています')) {
      statusCode = 409
      errorCode = 'AUTH_EMAIL_IN_USE'
      errorMessage = 'このメールアドレスは既に登録されています'
    } else if (message.includes('パスワードは8文字以上')) {
      statusCode = 400
      errorCode = 'AUTH_WEAK_PASSWORD'
      errorMessage = 'パスワードは8文字以上で設定してください'
    } else if (message.includes('有効なメールアドレス')) {
      statusCode = 400
      errorCode = 'AUTH_INVALID_EMAIL'
      errorMessage = '有効なメールアドレスを入力してください'
    } else if (message.includes('リクエストが多すぎます')) {
      statusCode = 429
      errorCode = 'AUTH_RATE_LIMITED'
      errorMessage = 'リクエストが多すぎます。しばらくしてからお試しください'
    } else if (message.includes('JWT_SECRET')) {
      statusCode = 500
      errorCode = 'AUTH_SERVER_MISCONFIG'
      errorMessage = 'サーバー設定エラーのため登録できません。管理者に連絡してください。'
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

