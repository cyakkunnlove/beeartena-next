import { NextRequest, NextResponse } from 'next/server'
import admin, { getAdminDb } from '@/lib/firebase/admin'
import { errorResponse, getRequestId, successResponse, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  // 認証チェック
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401, 'AUTH_REQUIRED', requestId ? { requestId } : {}))
  }

  try {
    const db = getAdminDb()

    if (!db) {
      return setCorsHeaders(successResponse({
        id: authUser.userId,
        role: authUser.role,
        warning: 'Firebase admin is not configured; returning token-based profile only.',
      }))
    }

    const userDoc = await db.collection('users').doc(authUser.userId).get()

    if (!userDoc.exists) {
      return setCorsHeaders(errorResponse('ユーザーが見つかりません', 404, 'USER_NOT_FOUND', requestId ? { requestId } : {}))
    }

    const userData = userDoc.data()!
    const user = {
      id: authUser.userId,
      ...userData,
      createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt
    }

    return setCorsHeaders(successResponse(user))
  } catch (error: any) {
    console.error('Auth me error:', error)
    return setCorsHeaders(
      errorResponse(
        'ユーザー情報の取得に失敗しました',
        500,
        'AUTH_SERVER_ERROR',
        requestId ? { requestId } : {},
      ),
    )
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request)
  // 認証チェック
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401, 'AUTH_REQUIRED', requestId ? { requestId } : {}))
  }

  try {
    const body = await request.json()
    const {
      email,
      name,
      phone,
      birthDate,
      gender,
      postalCode,
      prefecture,
      city,
      address,
    } = body

    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(errorResponse('Firebase admin is not configured', 503, 'AUTH_SERVER_MISCONFIG', requestId ? { requestId } : {}))
    }

    const userRef = db.collection('users').doc(authUser.userId)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return setCorsHeaders(errorResponse('ユーザーが見つかりません', 404, 'USER_NOT_FOUND', requestId ? { requestId } : {}))
    }
    const existingUser = userSnap.data() ?? {}

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // 各フィールドが提供されている場合のみ更新
    if (email !== undefined) {
      const normalizedEmail = String(email ?? '').trim().toLowerCase()
      if (!normalizedEmail) {
        return setCorsHeaders(errorResponse('メールアドレスを入力してください', 400, 'AUTH_INVALID_INPUT', requestId ? { requestId } : {}))
      }
      const existingEmail =
        typeof existingUser.email === 'string' ? existingUser.email.trim().toLowerCase() : ''
      if (existingEmail && existingEmail !== normalizedEmail) {
        return setCorsHeaders(errorResponse('メールアドレスの変更は現在できません', 400, 'AUTH_INVALID_INPUT', requestId ? { requestId } : {}))
      }
      updateData.email = normalizedEmail
      updateData.emailLower = normalizedEmail
    }
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (birthDate !== undefined) {
      updateData.birthDate = birthDate
      updateData.birthday = birthDate
    }
    if (gender !== undefined) updateData.gender = gender
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (prefecture !== undefined) updateData.prefecture = prefecture
    if (city !== undefined) updateData.city = city
    if (address !== undefined) updateData.address = address

    await userRef.update(updateData)

    // 更新後のユーザー情報を取得
    const userDoc = await userRef.get()
    const userData = userDoc.data()!
    const user = {
      id: authUser.userId,
      ...userData,
      createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt,
      updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : userData.updatedAt
    }

    return setCorsHeaders(successResponse(user))
  } catch (error: any) {
    console.error('User update error:', error)
    return setCorsHeaders(
      errorResponse(
        'ユーザー情報の更新に失敗しました',
        500,
        'AUTH_SERVER_ERROR',
        requestId ? { requestId } : {},
      ),
    )
  }
}
