import { SignJWT } from 'jose';
import { User } from '@/lib/types';

// JWTシークレット（環境変数から取得）
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
};

// JWTトークンを生成
export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7日間有効
    .sign(getJwtSecret());

  return token;
}