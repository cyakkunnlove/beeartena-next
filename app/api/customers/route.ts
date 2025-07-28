import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/firebase/users'
import { errorResponse, successResponse, setCorsHeaders, requireAdmin } from '@/lib/api/middleware'

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 顧客一覧取得（管理者のみ）
export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  try {
    const users = await userService.getAllUsers()
    // 管理者以外のユーザーのみ返す
    const customers = users.filter((user) => user.role === 'customer')

    return setCorsHeaders(successResponse(customers))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '顧客一覧の取得に失敗しました', 500))
  }
}
