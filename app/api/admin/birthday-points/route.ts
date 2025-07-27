import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/authService';
import { birthdayPointsService } from '@/lib/services/birthdayPoints';
import { errorResponse, successResponse, setCorsHeaders } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }));
}

export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const user = await authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return setCorsHeaders(errorResponse('管理者権限が必要です', 403));
    }

    // 誕生日ポイント処理を実行
    const results = await birthdayPointsService.checkAllUsersBirthdays();

    return setCorsHeaders(successResponse({
      message: '誕生日ポイント処理が完了しました',
      results: {
        checked: results.checked,
        granted: results.granted,
        errors: results.errors.length,
        errorDetails: results.errors
      }
    }));
  } catch (error: any) {
    console.error('Birthday points batch error:', error);
    return setCorsHeaders(errorResponse('誕生日ポイント処理に失敗しました', 500));
  }
}