import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'

import type { Customer } from '@/lib/types'

/**
 * GET /api/admin/customers
 * 管理者用: 全顧客データをFirebase Admin SDKで取得
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

    const usersSnapshot = await db.collection('users').get()

    const customers = usersSnapshot.docs
      .map((doc) => {
        const data = doc.data()

        // adminユーザーは除外
        if (data.role === 'admin') {
          return null
        }

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
        } as Customer
      })
      .filter((customer): customer is Customer => customer !== null)

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        customers,
      }),
    )
  } catch (error) {
    console.error('Admin customers fetch error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to load customers.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}

/**
 * PATCH /api/admin/customers?id=xxx
 * 管理者用: 顧客データの更新
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
    const customerId = url.searchParams.get('id')

    if (!customerId) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Customer ID is required' }, { status: 400 }),
      )
    }

    const body = await request.json()
    const updates = {
      ...body,
      updatedAt: new Date(),
    }

    await db.collection('users').doc(customerId).update(updates)

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: 'Customer updated successfully',
      }),
    )
  } catch (error) {
    console.error('Admin customer update error:', error)
    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to update customer.',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    )
  }
}
