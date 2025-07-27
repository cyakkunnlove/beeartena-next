import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/lib/reservationService';
import { errorResponse, successResponse, validateRequestBody, setCorsHeaders, verifyAuth, requireAdmin } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }));
}

// 予約一覧取得
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  try {
    let reservations;
    
    // 管理者は全予約を取得、一般ユーザーは自分の予約のみ
    if (authUser.role === 'admin') {
      reservations = await reservationService.getAllReservations();
    } else {
      reservations = await reservationService.getUserReservations(authUser.userId);
    }

    return setCorsHeaders(successResponse(reservations));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約一覧の取得に失敗しました', 500));
  }
}

// 予約作成
export async function POST(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401));
  }

  const { data, error } = await validateRequestBody<{
    serviceId: string;
    serviceName: string;
    price: number;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    notes?: string;
  }>(request, ['serviceId', 'serviceName', 'price', 'date', 'time', 'customerName', 'customerPhone', 'customerEmail']);

  if (error) return setCorsHeaders(error);

  try {
    // 予約可能な時間枠かチェック
    const slots = await reservationService.getTimeSlotsForDate(data.date);
    const selectedSlot = slots.find(slot => slot.time === data.time);
    
    if (!selectedSlot || !selectedSlot.available) {
      return setCorsHeaders(errorResponse('選択された時間枠は予約できません', 400));
    }

    // serviceIdからserviceTypeへのマッピング
    const serviceTypeMap: Record<string, '2D' | '3D' | '4D'> = {
      '2d-eyelash': '2D',
      '3d-eyelash': '3D',
      '4d-eyelash': '4D'
    };
    
    const serviceType = serviceTypeMap[data.serviceId];
    if (!serviceType) {
      return setCorsHeaders(errorResponse('無効なサービスIDです', 400));
    }

    // 予約作成
    const reservation = await reservationService.createReservation({
      ...data,
      serviceType,
      customerId: authUser.userId,
      status: 'pending',
      updatedAt: new Date()
    });

    return setCorsHeaders(successResponse(reservation, 201));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約の作成に失敗しました', 500));
  }
}