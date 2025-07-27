import { NextRequest } from 'next/server';
import { pointService } from '@/lib/firebase/points';
import { errorResponse, successResponse, setCorsHeaders, verifyAuth, requireAdmin } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new Response(null, { status: 200 }));
}

// ポイント履歴取得
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // 管理者は任意のユーザーのポイント履歴を取得可能
    const targetUserId = (authUser.role === 'admin' && userId) ? userId : authUser.userId;
    
    const [history, balance] = await Promise.all([
      pointService.getUserPointHistory(targetUserId),
      pointService.getUserPoints(targetUserId)
    ]);

    return setCorsHeaders(successResponse({
      balance,
      history
    }));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ポイント履歴の取得に失敗しました', 500));
  }
}

// ポイント付与（管理者のみ）
export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request);
  if (adminError) return setCorsHeaders(adminError);

  try {
    const body = await request.json();
    const { userId, amount, description, type = 'add' } = body;

    if (!userId || !amount || !description) {
      return setCorsHeaders(errorResponse('必須パラメータが不足しています', 400));
    }

    let result;
    if (type === 'add') {
      result = await pointService.addPoints(userId, amount, description);
    } else if (type === 'use') {
      result = await pointService.usePoints(userId, amount, description);
    } else {
      return setCorsHeaders(errorResponse('無効なタイプです', 400));
    }

    return setCorsHeaders(successResponse(result, 201));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ポイント操作に失敗しました', 500));
  }
}