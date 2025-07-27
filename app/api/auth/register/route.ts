import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/authService';
import { generateToken } from '@/lib/api/jwt';
import { errorResponse, successResponse, validateRequestBody, rateLimit, setCorsHeaders } from '@/lib/api/middleware';

export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new Response(null, { status: 200 }));
}

export async function POST(request: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = rateLimit(request, 3, 60000); // 1分間に3回まで
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse);

  // リクエストボディの検証
  const { data, error } = await validateRequestBody<{
    email: string;
    password: string;
    name: string;
    phone: string;
  }>(request, ['email', 'password', 'name', 'phone']);
  
  if (error) return setCorsHeaders(error);

  // バリデーション
  if (!data.email.includes('@')) {
    return setCorsHeaders(errorResponse('有効なメールアドレスを入力してください'));
  }
  
  if (data.password.length < 6) {
    return setCorsHeaders(errorResponse('パスワードは6文字以上で設定してください'));
  }

  try {
    // 新規登録処理
    const user = await authService.register(
      data.email,
      data.password,
      data.name,
      data.phone
    );
    
    // JWTトークン生成
    const token = await generateToken(user);

    return setCorsHeaders(successResponse({
      user,
      token,
    }, 201));
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '登録に失敗しました', 400));
  }
}