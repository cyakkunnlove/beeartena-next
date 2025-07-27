import { NextRequest, NextResponse } from 'next/server';
import { pointService } from '@/lib/firebase/points';
import { errorResponse, successResponse, setCorsHeaders, verifyAuth } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }));
}

// ポイント残高のみ取得
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  try {
    const balance = await pointService.getUserPoints(authUser.userId);
    return setCorsHeaders(successResponse({ balance }));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ポイント残高の取得に失敗しました', 500));
  }
}