import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/firebase/config'

// JWTシークレット（環境変数から取得）
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }
  return new TextEncoder().encode(secret)
}

// CORSヘッダーを設定
export function setCorsHeaders(response: Response | NextResponse): NextResponse {
  // ResponseをNextResponseに変換
  const nextResponse =
    response instanceof NextResponse
      ? response
      : new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })

  nextResponse.headers.set('Access-Control-Allow-Origin', '*')
  nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return nextResponse
}

// 認証ミドルウェア
export async function verifyAuth(
  request: NextRequest,
): Promise<{ userId: string; role: string } | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, getJwtSecret())

    return {
      userId: payload.userId as string,
      role: payload.role as string,
    }
  } catch (error) {
    return null
  }
}

// 管理者権限チェック
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const user = await verifyAuth(request)

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  return null // 権限OK
}

// ユーザー権限チェック（本人または管理者）
export async function requireUserOrAdmin(
  request: NextRequest,
  targetUserId: string,
): Promise<NextResponse | null> {
  const user = await verifyAuth(request)

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  if (user.userId !== targetUserId && user.role !== 'admin') {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  return null // 権限OK
}

// レート制限（簡易版）
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 60000,
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const now = Date.now()

  let requestData = requestCounts.get(ip)

  if (!requestData || now > requestData.resetTime) {
    requestData = { count: 1, resetTime: now + windowMs }
    requestCounts.set(ip, requestData)
    return null
  }

  requestData.count++

  if (requestData.count > limit) {
    return NextResponse.json(
      { error: 'リクエスト数が制限を超えました。しばらくしてから再度お試しください。' },
      { status: 429 },
    )
  }

  return null
}

// エラーレスポンスのフォーマット
export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// 成功レスポンスのフォーマット
export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// リクエストボディの検証
export async function validateRequestBody<T>(
  request: NextRequest,
  requiredFields: (keyof T)[],
): Promise<{ data: T; error: NextResponse | null }> {
  try {
    const body = await request.json()

    for (const field of requiredFields) {
      if (!(field in body)) {
        return {
          data: {} as T,
          error: errorResponse(`必須フィールド '${String(field)}' が不足しています`, 400),
        }
      }
    }

    return { data: body as T, error: null }
  } catch (error) {
    return {
      data: {} as T,
      error: errorResponse('不正なJSONフォーマットです', 400),
    }
  }
}
