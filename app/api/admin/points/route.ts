import { NextRequest, NextResponse } from 'next/server'

import { POINTS_PROGRAM_ENABLED } from '@/lib/constants/featureFlags'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import admin, { getAdminDb } from '@/lib/firebase/admin'

import type { PointTransaction, Points } from '@/lib/types'

type FirestoreDateLike = Date | string | { toDate?: () => Date } | { seconds?: number; nanoseconds?: number }

const toDate = (value: unknown): Date => {
  if (!value) {
    return new Date()
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }

  if (value && typeof value === 'object') {
    const record = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number }
    if (typeof record.toDate === 'function') {
      try {
        const parsed = record.toDate()
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed
      } catch {
        return new Date()
      }
    }

    if (typeof record.seconds === 'number') {
      const seconds = record.seconds
      const nanos = record.nanoseconds ?? 0
      return new Date(seconds * 1000 + nanos / 1_000_000)
    }
  }

  return new Date()
}

const toIsoString = (value: unknown): string => toDate(value).toISOString()

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const toOptionalNumber = (value: unknown): number | undefined => {
  const parsed = toNumber(value, Number.NaN)
  return Number.isNaN(parsed) ? undefined : parsed
}

const normalizeTier = (value: unknown): Points['tier'] => {
  const tiers: Points['tier'][] = ['bronze', 'silver', 'gold', 'platinum']
  if (typeof value === 'string' && tiers.includes(value as Points['tier'])) {
    return value as Points['tier']
  }
  return 'bronze'
}

interface AdminPointSummaryResponse extends Points {
  userName: string
  userEmail: string
  userPhone?: string
}

interface AdminPointTransactionResponse extends PointTransaction {
  createdAt: string
}

/**
 * GET /api/admin/points
 * 管理者用: 全ユーザーのポイント情報と直近のトランザクションを取得
 */
export async function GET(request: NextRequest) {
  if (!POINTS_PROGRAM_ENABLED) {
    const response = NextResponse.json({
      success: true,
      disabled: true,
      summaries: [],
      transactions: [],
      message: 'ポイント制度は終了しました',
    })
    return setCorsHeaders(response)
  }

  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  try {
    const db = getAdminDb()

    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            error: 'Firebase admin is not configured. Please set FIREBASE_ADMIN_* env vars.',
          },
          { status: 503 },
        ),
      )
    }

    const [usersSnapshot, pointsSnapshot, transactionsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('points').get(),
      db.collection('pointTransactions').orderBy('createdAt', 'desc').limit(100).get(),
    ])

    const pointsMap = new Map<string, Record<string, unknown>>()
    pointsSnapshot.docs.forEach((doc) => {
      pointsMap.set(doc.id, doc.data())
    })

    const summaries: AdminPointSummaryResponse[] = usersSnapshot.docs.flatMap((doc) => {
        const data = doc.data() ?? {}

        if (data.role === 'admin') {
          return []
        }

        const pointData = pointsMap.get(doc.id) ?? {}
        const currentPoints = toNumber(pointData.currentPoints ?? data.points ?? 0)
        const lifetimePoints = toNumber(pointData.lifetimePoints ?? data.lifetimePoints ?? 0)
        const tier = normalizeTier(pointData.tier ?? data.tier)
        const tierExpiry = pointData.tierExpiry ? toDate(pointData.tierExpiry) : undefined

        return [{
          userId: doc.id,
          currentPoints,
          lifetimePoints,
          tier,
          tierExpiry,
          userName: typeof data.name === 'string' ? data.name : '',
          userEmail: typeof data.email === 'string' ? data.email : '',
          userPhone: typeof data.phone === 'string' ? data.phone : undefined,
        }]
      })

    const recentTransactions: AdminPointTransactionResponse[] = transactionsSnapshot.docs
      .map((doc) => {
        const data = doc.data() ?? {}
        const amount = toNumber(data.amount, 0)
        const derivedType = typeof data.type === 'string' && data.type.trim().length > 0
          ? data.type
          : amount >= 0
            ? 'earned'
            : 'redeemed'

        return {
          id: doc.id,
          userId: typeof data.userId === 'string' ? data.userId : '',
          amount,
          balance: toOptionalNumber(data.balance),
          type: derivedType as PointTransaction['type'],
          description: typeof data.description === 'string' ? data.description : undefined,
          reason: typeof data.reason === 'string' ? data.reason : undefined,
          referenceId: typeof data.referenceId === 'string' ? data.referenceId : undefined,
          createdAt: toIsoString(data.createdAt),
        }
      })
      .filter((item) => item.userId)

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        points: summaries,
        transactions: recentTransactions,
      }),
    )
  } catch (error) {
    console.error('Admin points fetch error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to load points data.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}

/**
 * POST /api/admin/points
 * 管理者用: ポイント履歴取得・付与/使用
 */
export async function POST(request: NextRequest) {
  if (!POINTS_PROGRAM_ENABLED) {
    const response = NextResponse.json(
      {
        success: false,
        disabled: true,
        message: 'ポイント制度は終了しました',
      },
      { status: 410 },
    )
    return setCorsHeaders(response)
  }

  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  try {
    const db = getAdminDb()

    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            error: 'Firebase admin is not configured.',
          },
          { status: 503 },
        ),
      )
    }

    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : ''

    if (action === 'getTransactions') {
      const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
      if (!userId) {
        return setCorsHeaders(NextResponse.json({ error: 'userId is required' }, { status: 400 }))
      }

      const transactionsSnapshot = await db
        .collection('pointTransactions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const transactions: AdminPointTransactionResponse[] = transactionsSnapshot.docs.map((doc) => {
        const data = doc.data() ?? {}
        const amount = toNumber(data.amount, 0)
        const derivedType = typeof data.type === 'string' && data.type.trim().length > 0
          ? data.type
          : amount >= 0
            ? 'earned'
            : 'redeemed'

        return {
          id: doc.id,
          userId,
          amount,
          balance: toOptionalNumber(data.balance),
          type: derivedType as PointTransaction['type'],
          description: typeof data.description === 'string' ? data.description : undefined,
          reason: typeof data.reason === 'string' ? data.reason : undefined,
          referenceId: typeof data.referenceId === 'string' ? data.referenceId : undefined,
          createdAt: toIsoString(data.createdAt),
        }
      })

      return setCorsHeaders(
        NextResponse.json({
          success: true,
          transactions,
        }),
      )
    }

    if (action === 'adjust') {
      const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
      const description = typeof body?.description === 'string' ? body.description.trim() : ''
      const mode = body?.mode === 'use' ? 'use' : 'add'
      const amount = toNumber(body?.amount, Number.NaN)

      if (!userId) {
        return setCorsHeaders(NextResponse.json({ error: 'userId is required' }, { status: 400 }))
      }

      if (!description) {
        return setCorsHeaders(NextResponse.json({ error: 'description is required' }, { status: 400 }))
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return setCorsHeaders(NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 }))
      }

      const adjustment = mode === 'use' ? -amount : amount

      const result = await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(userId)
        const userSnap = await tx.get(userRef)

        if (!userSnap.exists) {
          throw new Error('ユーザーが見つかりません')
        }

        const userData = userSnap.data() ?? {}
        const currentPoints = toNumber(userData.points, 0)
        const lifetimePoints = toNumber(userData.lifetimePoints, 0)
        const tier = normalizeTier(userData.tier)

        const newBalance = currentPoints + adjustment
        if (newBalance < 0) {
          throw new Error('ポイント残高が不足しています')
        }

        const newLifetime = mode === 'add' ? lifetimePoints + amount : lifetimePoints

        tx.update(userRef, {
          points: newBalance,
          lifetimePoints: newLifetime,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        const pointsRef = db.collection('points').doc(userId)
        tx.set(
          pointsRef,
          {
            userId,
            currentPoints: newBalance,
            lifetimePoints: newLifetime,
            tier,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )

        const historyRef = db.collection('pointTransactions').doc()
        const historyPayload = {
          userId,
          amount: adjustment,
          balance: newBalance,
          description,
          reason: description,
          type: mode === 'use' ? 'redeemed' : 'manual',
          referenceId: `admin-${mode}-${historyRef.id}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        tx.set(historyRef, historyPayload)

        const summary: AdminPointSummaryResponse = {
          userId,
          userName: typeof userData.name === 'string' ? userData.name : '',
          userEmail: typeof userData.email === 'string' ? userData.email : '',
          userPhone: typeof userData.phone === 'string' ? userData.phone : undefined,
          currentPoints: newBalance,
          lifetimePoints: newLifetime,
          tier,
          tierExpiry: undefined,
        }

        const transaction: AdminPointTransactionResponse = {
          id: historyRef.id,
          userId,
          amount: adjustment,
          balance: newBalance,
          type: historyPayload.type as PointTransaction['type'],
          description,
          reason: description,
          referenceId: historyPayload.referenceId,
          createdAt: new Date().toISOString(),
        }

        return { summary, transaction }
      })

      return setCorsHeaders(
        NextResponse.json({
          success: true,
          summary: result.summary,
          transaction: result.transaction,
          message: mode === 'use' ? 'ポイントを減算しました' : 'ポイントを付与しました',
        }),
      )
    }

    return setCorsHeaders(NextResponse.json({ error: 'Invalid action' }, { status: 400 }))
  } catch (error) {
    console.error('Admin points action error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process points request.'
    const status = message.includes('不足') ? 400 : 500

    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status },
      ),
    )
  }
}
