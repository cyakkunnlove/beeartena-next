import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/firebase/users'
import {
  errorResponse,
  successResponse,
  setCorsHeaders,
  requireAdmin,
  requireUserOrAdmin,
} from '@/lib/api/middleware'

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 顧客詳細取得（本人または管理者）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authError = await requireUserOrAdmin(request, id)
  if (authError) return setCorsHeaders(authError)

  try {
    const user = await userService.getUser(id)

    if (!user) {
      return setCorsHeaders(errorResponse('顧客が見つかりません', 404))
    }

    return setCorsHeaders(successResponse(user))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '顧客情報の取得に失敗しました', 500))
  }
}

// 顧客情報更新（本人または管理者）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authError = await requireUserOrAdmin(request, id)
  if (authError) return setCorsHeaders(authError)

  try {
    const body = await request.json()

    // roleとpointsは更新不可
    const { role, points, id: _id, ...updates } = body

    await userService.updateUser(id, updates)
    const updatedUser = await userService.getUser(id)

    return setCorsHeaders(successResponse(updatedUser))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '顧客情報の更新に失敗しました', 500))
  }
}
