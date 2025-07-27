import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/authService';
import { successResponse, setCorsHeaders, verifyAuth } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }));
}

export async function POST(request: NextRequest) {
  // 認証チェック
  const user = await verifyAuth(request);
  if (!user) {
    return setCorsHeaders(successResponse({ message: 'ログアウトしました' }));
  }

  try {
    await authService.logout();
    return setCorsHeaders(successResponse({ message: 'ログアウトしました' }));
  } catch (error: any) {
    // ログアウトは常に成功として扱う
    return setCorsHeaders(successResponse({ message: 'ログアウトしました' }));
  }
}