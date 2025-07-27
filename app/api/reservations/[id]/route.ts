import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/lib/reservationService';
import { errorResponse, successResponse, setCorsHeaders, verifyAuth, requireAdmin } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }));
}

// 予約詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  try {
    const reservation = await reservationService.getReservation(id);
    
    if (!reservation) {
      return setCorsHeaders(errorResponse('予約が見つかりません', 404));
    }

    // 本人または管理者のみアクセス可能
    if (reservation.customerId !== authUser.userId && authUser.role !== 'admin') {
      return setCorsHeaders(errorResponse('アクセス権限がありません', 403));
    }

    return setCorsHeaders(successResponse(reservation));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約の取得に失敗しました', 500));
  }
}

// 予約更新（管理者のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminError = await requireAdmin(request);
  if (adminError) return setCorsHeaders(adminError);

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'confirm':
        await reservationService.confirmReservation(id);
        return setCorsHeaders(successResponse({ message: '予約を確定しました' }));
        
      case 'complete':
        await reservationService.completeReservation(id);
        return setCorsHeaders(successResponse({ message: '予約を完了しました' }));
        
      case 'cancel':
        await reservationService.cancelReservation(id, body.reason);
        return setCorsHeaders(successResponse({ message: '予約をキャンセルしました' }));
        
      default:
        return setCorsHeaders(errorResponse('無効なアクションです', 400));
    }
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約の更新に失敗しました', 500));
  }
}

// 予約キャンセル（本人または管理者）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  try {
    const reservation = await reservationService.getReservation(id);
    
    if (!reservation) {
      return setCorsHeaders(errorResponse('予約が見つかりません', 404));
    }

    // 本人または管理者のみキャンセル可能
    if (reservation.customerId !== authUser.userId && authUser.role !== 'admin') {
      return setCorsHeaders(errorResponse('アクセス権限がありません', 403));
    }

    const body = await request.json().catch(() => ({ reason: '' }));
    await reservationService.cancelReservation(id, body.reason);

    return setCorsHeaders(successResponse({ message: '予約をキャンセルしました' }));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約のキャンセルに失敗しました', 500));
  }
}