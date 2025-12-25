import { NextRequest, NextResponse } from 'next/server'

import admin, { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { generateToken } from '@/lib/api/jwt'
import { errorResponse, getRequestId, rateLimit, setCorsHeaders, validateRequestBody } from '@/lib/api/middleware'

import type { User } from '@/lib/types'

type Payload = { idToken: string }

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in (value as { toDate?: unknown })) {
    const maybe = value as { toDate?: () => Date }
    if (typeof maybe.toDate === 'function') {
      const d = maybe.toDate()
      return Number.isNaN(d.getTime()) ? new Date() : d
    }
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? new Date() : d
  }
  return new Date()
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// Firebase ID Token → アプリJWTへ交換（Googleログイン等）
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const rateLimitResponse = rateLimit(request, 10, 60000)
  if (rateLimitResponse) return setCorsHeaders(rateLimitResponse)

  const { data, error } = await validateRequestBody<Payload>(request, ['idToken'])
  if (error) return setCorsHeaders(error)

  const idToken = String(data.idToken ?? '').trim()
  if (!idToken) {
    return setCorsHeaders(errorResponse('idToken is required', 400, 'AUTH_INVALID_INPUT', requestId ? { requestId } : {}))
  }

  const auth = getAdminAuth()
  const db = getAdminDb()
  if (!auth || !db) {
    return setCorsHeaders(errorResponse('Firebase admin is not configured', 503, 'AUTH_SERVER_MISCONFIG', requestId ? { requestId } : {}))
  }

  try {
    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid
    const email = typeof decoded.email === 'string' ? decoded.email : ''
    const name =
      typeof decoded.name === 'string'
        ? decoded.name
        : typeof (decoded as { displayName?: unknown }).displayName === 'string'
          ? String((decoded as { displayName?: unknown }).displayName)
          : ''

    if (!uid) {
      return setCorsHeaders(errorResponse('Invalid Firebase token', 401, 'AUTH_FIREBASE_TOKEN_INVALID', requestId ? { requestId } : {}))
    }

    const userRef = db.collection('users').doc(uid)
    const snap = await userRef.get()

    if (!snap.exists) {
      await userRef.set(
        {
          email,
          name,
          phone: '',
          role: 'customer',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    } else {
      const existing = snap.data() ?? {}
      if (existing.deleted) {
        return setCorsHeaders(errorResponse('このアカウントは無効化されています', 403, 'AUTH_ACCOUNT_DISABLED', requestId ? { requestId } : {}))
      }
      // email/nameが空で入ってくるケースの保険
      const patch: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() }
      if (email && typeof existing.email !== 'string') patch.email = email
      if (name && typeof existing.name !== 'string') patch.name = name
      if (Object.keys(patch).length > 1) {
        await userRef.set(patch, { merge: true })
      }
    }

    const updatedSnap = await userRef.get()
    const raw = updatedSnap.data() ?? {}

    const user: User = {
      id: uid,
      email: typeof raw.email === 'string' ? raw.email : email,
      name: typeof raw.name === 'string' ? raw.name : name,
      phone: typeof raw.phone === 'string' ? raw.phone : '',
      role: raw.role === 'admin' ? 'admin' : 'customer',
      points: typeof raw.points === 'number' ? raw.points : undefined,
      birthday: typeof raw.birthday === 'string' ? raw.birthday : undefined,
      birthDate: typeof raw.birthDate === 'string' ? raw.birthDate : undefined,
      createdAt: toDate(raw.createdAt),
      updatedAt: toDate(raw.updatedAt),
      termsAcceptedAt: raw.termsAcceptedAt ? toDate(raw.termsAcceptedAt) : undefined,
      privacyAcceptedAt: raw.privacyAcceptedAt ? toDate(raw.privacyAcceptedAt) : undefined,
      gender: typeof raw.gender === 'string' ? raw.gender : undefined,
      postalCode: typeof raw.postalCode === 'string' ? raw.postalCode : undefined,
      prefecture: typeof raw.prefecture === 'string' ? raw.prefecture : undefined,
      city: typeof raw.city === 'string' ? raw.city : undefined,
      street: typeof raw.street === 'string' ? raw.street : undefined,
      address: typeof raw.address === 'string' || typeof raw.address === 'object' ? raw.address : undefined,
    }

    const token = await generateToken(user)
    return setCorsHeaders(NextResponse.json({ user, token }))
  } catch (err: any) {
    const message = String(err?.message || '')
    const code =
      message.includes('JWT_SECRET') ? 'AUTH_SERVER_MISCONFIG' : 'AUTH_FIREBASE_TOKEN_INVALID'
    const errorMessage =
      code === 'AUTH_SERVER_MISCONFIG'
        ? 'サーバー設定エラーのためログインできません。管理者に連絡してください。'
        : '認証に失敗しました'
    return setCorsHeaders(errorResponse(errorMessage, 401, code, requestId ? { requestId } : {}))
  }
}
