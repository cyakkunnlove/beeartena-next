import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { errorResponse, successResponse, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  try {
    // Firebase Admin SDKを使用してユーザー情報を取得
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(authUser.userId).get()

    if (!userDoc.exists) {
      return setCorsHeaders(errorResponse('ユーザーが見つかりません', 404))
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
    return setCorsHeaders(errorResponse(error.message || 'ユーザー情報の取得に失敗しました', 500))
  }
}

export async function PUT(request: NextRequest) {
  // 認証チェック
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  try {
    const body = await request.json()
    const {
      name,
      phone,
      birthDate,
      gender,
      postalCode,
      prefecture,
      city,
      address
    } = body

    // Firebase Admin SDKを使用してユーザー情報を更新
    const db = admin.firestore()
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    // 各フィールドが提供されている場合のみ更新
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (birthDate !== undefined) updateData.birthDate = birthDate
    if (gender !== undefined) updateData.gender = gender
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (prefecture !== undefined) updateData.prefecture = prefecture
    if (city !== undefined) updateData.city = city
    if (address !== undefined) updateData.address = address

    await db.collection('users').doc(authUser.userId).update(updateData)

    // 更新後のユーザー情報を取得
    const userDoc = await db.collection('users').doc(authUser.userId).get()
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
    return setCorsHeaders(errorResponse(error.message || 'ユーザー情報の更新に失敗しました', 500))
  }
}
