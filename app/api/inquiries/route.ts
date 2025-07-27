import { NextRequest } from 'next/server';
import { inquiryService } from '@/lib/firebase/inquiries';
import { errorResponse, successResponse, validateRequestBody, setCorsHeaders, verifyAuth, requireAdmin, rateLimit } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new Response(null, { status: 200 }));
}

// 問い合わせ一覧取得（管理者のみ）
export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request);
  if (adminError) return setCorsHeaders(adminError);

  try {
    const inquiries = await inquiryService.getAllInquiries();
    return setCorsHeaders(successResponse(inquiries));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '問い合わせ一覧の取得に失敗しました', 500));
  }
}

// 問い合わせ作成（認証不要だがレート制限あり）
export async function POST(request: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = rateLimit(request, 5, 3600000); // 1時間に5回まで
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse);

  const { data, error } = await validateRequestBody<{
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }>(request, ['name', 'email', 'subject', 'message']);

  if (error) return setCorsHeaders(error);

  try {
    const inquiry = await inquiryService.createInquiry(data);
    return setCorsHeaders(successResponse(inquiry, 201));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '問い合わせの送信に失敗しました', 500));
  }
}