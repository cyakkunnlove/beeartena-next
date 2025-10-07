import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'

import type { Reservation } from '@/lib/types'

/**
 * GET /api/admin/reservations
 * 管理者用: 全予約データをFirebase Admin SDKで取得
 * Firestoreルールを回避して直接データアクセス
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

    const reservationsSnapshot = await db.collection('reservations').get()

    const reservations = reservationsSnapshot.docs.map((doc) => {
      const data = doc.data()

      // Timestamp型のフィールドをDate型に変換
      const convertTimestampToDate = (field: unknown): Date => {
        if (field && typeof field === 'object' && 'toDate' in field) {
          return (field as { toDate: () => Date }).toDate()
        }
        if (typeof field === 'string') {
          return new Date(field)
        }
        return new Date()
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? convertTimestampToDate(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? convertTimestampToDate(data.updatedAt) : new Date(),
        completedAt: data.completedAt ? convertTimestampToDate(data.completedAt) : undefined,
        cancelledAt: data.cancelledAt ? convertTimestampToDate(data.cancelledAt) : undefined,
      } as Reservation
    })

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        reservations,
      }),
    )
  } catch (error) {
    console.error('Admin reservations fetch error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to load reservations.',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 },
      ),
    )
  }
}

/**
 * PATCH /api/admin/reservations?id=xxx
 * 管理者用: 予約データの更新
 */
export async function PATCH(request: NextRequest) {
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

    const url = new URL(request.url)
    const reservationId = url.searchParams.get('id')

    if (!reservationId) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Reservation ID is required' },
          { status: 400 },
        ),
      )
    }

    const body = await request.json()
    const updates = {
      ...body,
      updatedAt: new Date(),
    }

    // completedAt/cancelledAtもDate型で処理
    if (body.completedAt) {
      updates.completedAt = new Date(body.completedAt)
    }
    if (body.cancelledAt) {
      updates.cancelledAt = new Date(body.cancelledAt)
    }

    await db.collection('reservations').doc(reservationId).update(updates)

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: 'Reservation updated successfully',
      }),
    )
  } catch (error) {
    console.error('Admin reservation update error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to update reservation.',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 },
      ),
    )
  }
}

/**
 * DELETE /api/admin/reservations?id=xxx
 * 管理者用: 予約データの削除
 */
export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url)
    const reservationId = url.searchParams.get('id')

    if (!reservationId) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Reservation ID is required' },
          { status: 400 },
        ),
      )
    }

    await db.collection('reservations').doc(reservationId).delete()

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: 'Reservation deleted successfully',
      }),
    )
  } catch (error) {
    console.error('Admin reservation delete error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to delete reservation.',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 },
      ),
    )
  }
}
