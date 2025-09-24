import { JWTPayload, SignJWT, jwtVerify } from 'jose'

import { User } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

const FALLBACK_SECRET = 'development-secret-change-me'
const DEFAULT_EXPIRATION = '7d'

let warnedAboutFallback = false

function resolveSecret(): string {
  const configured = process.env.JWT_SECRET?.trim()
  if (configured && configured.length >= 16) {
    return configured
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not configured for production environment')
  }

  if (!warnedAboutFallback) {
    logger.warn('Using fallback JWT secret; configure JWT_SECRET for production usage')
    warnedAboutFallback = true
  }

  return FALLBACK_SECRET
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(resolveSecret())
}

export interface TokenPayload extends JWTPayload {
  userId: string
  email?: string
  role?: string
}

export interface GenerateTokenOptions {
  expiresIn?: string
}

export async function generateToken(user: User, options: GenerateTokenOptions = {}): Promise<string> {
  const expiresIn = options.expiresIn || DEFAULT_EXPIRATION

  return await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  } satisfies TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret())
}

export const signJWT = generateToken

export async function verifyJWT(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify<TokenPayload>(token, getJwtSecret())

    if (!payload.userId) {
      throw new Error('Token payload missing userId')
    }

    return payload
  } catch (error) {
    logger.warn('JWT verification failed', { error })
    throw new Error('トークンの検証に失敗しました')
  }
}
