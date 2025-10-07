import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  setCorsHeaders,
  verifyAuth,
  requireAdmin,
} from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { pointService } from '@/lib/firebase/points'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// ポイント履歴取得
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request)
  if (!authUser) {
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  try {
    // 管理者は任意のユーザーのポイント履歴を取得可能
    const targetUserId = authUser.role === 'admin' && userId ? userId : authUser.userId

    let history: any[] | null = null
    let balance: number | null = null

    const adminDb = getAdminDb()

    if (adminDb) {
      try {
        const [historySnapshot, userDoc] = await Promise.all([
          adminDb
            .collection('points')
            .where('userId', '==', targetUserId)
            .orderBy('createdAt', 'desc')
            .get(),
          adminDb.collection('users').doc(targetUserId).get(),
        ])

        if (!userDoc.exists) {
          throw new Error('ユーザーが見つかりません')
        }

        const userData = userDoc.data() ?? {}
        balance = typeof userData.points === 'number' ? userData.points : 0

        history = historySnapshot.docs.map((doc) => {
          const data = doc.data() ?? {}
          const createdAtValue = data.createdAt
          let createdAtISO: string
          if (createdAtValue?.toDate) {
            createdAtISO = createdAtValue.toDate().toISOString()
          } else if (createdAtValue instanceof Date) {
            createdAtISO = createdAtValue.toISOString()
          } else if (typeof createdAtValue === 'string') {
            const parsed = new Date(createdAtValue)
            createdAtISO = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
          } else {
            createdAtISO = new Date().toISOString()
          }

          const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount ?? 0)
          const entryBalance =
            typeof data.balance === 'number'
              ? data.balance
              : Number.isFinite(Number(data.balance))
                ? Number(data.balance)
                : undefined

          const entryType = typeof data.type === 'string' ? data.type : amount >= 0 ? 'earned' : 'used'

          return {
            id: doc.id,
            userId: data.userId ?? targetUserId,
            amount,
            balance: entryBalance,
            type: entryType,
            description: data.description ?? '',
            referenceId: data.referenceId ?? undefined,
            createdAt: createdAtISO,
          }
        })
      } catch (adminError) {
        console.warn('[points] Admin fetch failed, falling back to client SDK', adminError)
        history = null
        balance = null
      }
    }

    if (!history || balance === null) {
      try {
        const [clientHistory, clientBalance] = await Promise.all([
          pointService.getUserPointHistory(targetUserId),
          pointService.getUserPoints(targetUserId),
        ])
        history = clientHistory
        balance = clientBalance
      } catch (clientError) {
        console.warn('[points] Client SDK fallback failed, returning empty result', clientError)
        history = []
        balance = 0
      }
    }

    return setCorsHeaders(
      successResponse({
        balance,
        history,
      }),
    )
  } catch (error: any) {
    console.error('Failed to load points history:', error)

    const message = typeof error?.message === 'string' ? error.message : ''
    if (message.includes('Missing or insufficient permissions')) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[points] Returning empty response due to missing permissions in development environment')
        return setCorsHeaders(
          successResponse({
            balance: 0,
            history: [],
            warning: 'ポイントデータにアクセスできませんでした。環境変数またはFirebase認証情報を確認してください。',
          }),
        )
      }

      return setCorsHeaders(
        errorResponse('ポイントデータにアクセスする権限がありません。管理者にお問い合わせください。', 403),
      )
    }

    return setCorsHeaders(errorResponse(error.message || 'ポイント履歴の取得に失敗しました', 500))
  }
}

// ポイント付与（管理者のみ）
export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  try {
    const body = await request.json()
    const { userId, amount, description, type = 'add' } = body

    if (!userId || !amount || !description) {
      return setCorsHeaders(errorResponse('必須パラメータが不足しています', 400))
    }

    let result
    if (type === 'add') {
      result = await pointService.addPoints(userId, amount, description)
    } else if (type === 'use') {
      result = await pointService.usePoints(userId, amount, description)
    } else {
      return setCorsHeaders(errorResponse('無効なタイプです', 400))
    }

    return setCorsHeaders(successResponse(result, 201))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || 'ポイント操作に失敗しました', 500))
  }
}
