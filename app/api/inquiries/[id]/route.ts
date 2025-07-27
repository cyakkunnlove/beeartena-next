import { NextRequest } from 'next/server';
import { inquiryService } from '@/lib/firebase/inquiries';
import { errorResponse, successResponse, setCorsHeaders, requireAdmin } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new Response(null, { status: 200 }));
}

// 問い合わせ詳細取得（管理者のみ）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = await requireAdmin(request);
  if (adminError) return setCorsHeaders(adminError);

  try {
    const inquiry = await inquiryService.getInquiry(params.id);
    
    if (!inquiry) {
      return setCorsHeaders(errorResponse('問い合わせが見つかりません', 404));
    }

    return setCorsHeaders(successResponse(inquiry));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '問い合わせの取得に失敗しました', 500));
  }
}

// 問い合わせ更新（管理者のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = await requireAdmin(request);
  if (adminError) return setCorsHeaders(adminError);

  try {
    const body = await request.json();
    const { status, reply } = body;

    if (status) {
      await inquiryService.updateInquiryStatus(params.id, status);
    }

    if (reply) {
      await inquiryService.replyToInquiry(params.id, reply);
    }

    const updatedInquiry = await inquiryService.getInquiry(params.id);
    return setCorsHeaders(successResponse(updatedInquiry));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '問い合わせの更新に失敗しました', 500));
  }
}