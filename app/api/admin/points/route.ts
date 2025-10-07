import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'

import type { PointTransaction, Points } from '@/lib/types'

/**
 * GET /api/admin/points
 * 管理者用: 全ユーザーのポイント情報をFirebase Admin SDKで取得
 */
export async function GET(request: NextRequest) {
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

    // ポイント残高を取得
    const pointsSnapshot = await db.collection('points').get()

    const pointsData = pointsSnapshot.docs.map((doc) => {
      const data = doc.data()

      // Timestamp型のフィールドをDate型に変換
      const convertTimestampToDate = (field: unknown): Date | undefined => {
        if (field && typeof field === 'object' && 'toDate' in field) {
          return (field as { toDate: () => Date }).toDate()
        }
        if (typeof field === 'string') {
          return new Date(field)
        }
        return undefined
      }

      return {
        userId: doc.id,
        currentPoints: data.currentPoints || 0,
        lifetimePoints: data.lifetimePoints || 0,
        tier: data.tier || 'bronze',
        tierExpiry: data.tierExpiry ? convertTimestampToDate(data.tierExpiry) : undefined,
      } as Points
    })

    // ユーザー情報を取得してポイントデータに結合
    const usersSnapshot = await db.collection('users').get()
    const usersMap = new Map()

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.role !== 'admin') {
        usersMap.set(doc.id, {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
        })
      }
    })

    const enrichedPointsData = pointsData
      .map((points) => {
        const user = usersMap.get(points.userId)
        if (!user) return null

        return {
          ...points,
          userName: user.name,
          userEmail: user.email,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        points: enrichedPointsData,
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
 * GET /api/admin/points/transactions?userId=xxx
 * 管理者用: 指定ユーザーのポイント履歴を取得
 */
export async function POST(request: NextRequest) {
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
    const { userId, action } = body

    if (action === 'getTransactions' && userId) {
      // ユーザーのポイント履歴を取得
      const transactionsSnapshot = await db
        .collection('pointTransactions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const transactions = transactionsSnapshot.docs.map((doc) => {
        const data = doc.data()

        const convertTimestampToDate = (field: unknown): Date | string => {
          if (field && typeof field === 'object' && 'toDate' in field) {
            return (field as { toDate: () => Date }).toDate()
          }
          if (typeof field === 'string') {
            return field
          }
          return new Date()
        }

        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          balance: data.balance,
          description: data.description,
          reason: data.reason,
          referenceId: data.referenceId,
          createdAt: data.createdAt ? convertTimestampToDate(data.createdAt) : new Date(),
        } as PointTransaction
      })

      return setCorsHeaders(
        NextResponse.json({
          success: true,
          transactions,
        }),
      )
    }

    return setCorsHeaders(
      NextResponse.json({ error: 'Invalid action or missing userId' }, { status: 400 }),
    )
  } catch (error) {
    console.error('Admin points action error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to process points action.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}
