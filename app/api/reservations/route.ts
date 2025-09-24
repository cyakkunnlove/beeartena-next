import { NextRequest, NextResponse } from 'next/server'

import {
  errorResponse,
  successResponse,
  validateRequestBody,
  setCorsHeaders,
  verifyAuth,
} from '@/lib/api/middleware'
import { reservationService } from '@/lib/reservationService'
import { getAdminDb } from '@/lib/firebase/admin'
import { cache as cacheService } from '@/lib/api/cache'
import { CACHE_STRATEGY, setCacheHeaders, addFreshnessHeaders } from '@/lib/api/cache-strategy'

export async function OPTIONS(_request: NextRequest) {
  return setCorsHeaders(NextResponse.json(null, { status: 200 }))
}

// 予約一覧取得
export async function GET(request: NextRequest) {
  console.log('GET /api/reservations - Starting')
  const authUser = await verifyAuth(request)
  console.log('Auth user:', authUser)

  if (!authUser) {
    console.log('No auth user found - returning 401')
    return setCorsHeaders(errorResponse('認証が必要です', 401))
  }

  try {
    // URLパラメータから取得設定を取得
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50') // デフォルト50件
    const offset = parseInt(searchParams.get('offset') || '0')

    // キャッシュキーを生成（ユーザーごと＋ページネーション）
    const cacheKey = authUser.role === 'admin'
      ? `reservations:admin:${limit}:${offset}`
      : `reservations:user:${authUser.userId}:${limit}:${offset}`

    // 極短TTL（10秒）でキャッシュチェック
    try {
      const cached = await Promise.race([
        cacheService.get(cacheKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 100)) // 100msでタイムアウト
      ])
      if (cached) {
        // キャッシュされたデータを返す（Cache-Controlヘッダー付き）
        let response = NextResponse.json({
          success: true,
          reservations: cached,
          cached: true,
          timestamp: new Date().toISOString()
        })
        response = setCacheHeaders(response, 'RESERVATIONS')
        response = addFreshnessHeaders(response)
        return setCorsHeaders(response)
      }
    } catch (cacheError) {
      // キャッシュミスまたはタイムアウト - DBから取得続行
      console.log('Cache miss or timeout, fetching from DB')
    }

    const db = getAdminDb()
    if (!db) {
      return setCorsHeaders(NextResponse.json({
        success: true,
        reservations: [],
        hasMore: false,
        limit,
        offset,
        cached: false,
        warning: 'Firebase admin is not configured; returning empty reservation list.',
        timestamp: new Date().toISOString(),
      }))
    }

    let reservations = []
    let query

    // クエリを構築（selectを一時的に削除してインデックスエラーを回避）
    if (authUser.role === 'admin') {
      console.log('Building query for admin')
      query = db.collection('reservations')
        .orderBy('date', 'desc')
        .limit(limit)
    } else {
      console.log(`Building query for user: ${authUser.userId}`)
      query = db.collection('reservations')
        .where('customerId', '==', authUser.userId)
        .orderBy('date', 'desc')
        .limit(limit)
    }

    // オフセットが指定されている場合
    if (offset > 0) {
      // スキップするために最初のN件を取得して最後のドキュメントを取得
      const skipQuery = authUser.role === 'admin'
        ? db.collection('reservations').orderBy('date', 'desc').limit(offset)
        : db.collection('reservations').where('customerId', '==', authUser.userId).orderBy('date', 'desc').limit(offset)

      const skipSnapshot = await skipQuery.get()
      if (skipSnapshot.docs.length > 0) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1]
        query = query.startAfter(lastDoc)
      }
    }

    // タイムアウト対策: クエリ実行に制限時間を設定
    const queryStartTime = Date.now()
    const queryPromise = query.get()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 8000) // 8秒でタイムアウト
    )

    try {
      const snapshot = await Promise.race([queryPromise, timeoutPromise]) as any
      const queryTime = Date.now() - queryStartTime

      console.log(`Found ${snapshot.docs.length} reservations in ${queryTime}ms`)

      // データを効率的にマッピング
      reservations = snapshot.docs.map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        }
      })

      // パフォーマンスメトリクスを記録
      const dataSize = JSON.stringify(reservations).length
      console.log(`Query Performance Metrics:
        - Query Time: ${queryTime}ms
        - Documents: ${snapshot.docs.length}
        - Data Size: ${(dataSize / 1024).toFixed(2)}KB
        - Avg Doc Size: ${(dataSize / snapshot.docs.length / 1024).toFixed(2)}KB
        - Cache Key: ${cacheKey}
      `)

      // キャッシュに保存（極短TTL: 10秒）
      // メモリキャッシュは各インスタンスで独立しているが、短時間の重複リクエストを防ぐ
      const cacheDuration = CACHE_STRATEGY.RESERVATIONS.TTL // 10秒
      cacheService.set(cacheKey, reservations, cacheDuration).catch(err =>
        console.log('Cache save failed:', err)
      )

    } catch (queryError: any) {
      console.error('Query execution failed:', queryError.message)

      // タイムアウトの場合は部分的なデータでも返す
      if (queryError.message === 'Query timeout') {
        return setCorsHeaders(NextResponse.json({
          success: true,
          reservations: [],
          error: 'データの取得に時間がかかっています。しばらくしてから再度お試しください。',
          partial: true
        }))
      }
      throw queryError
    }

    console.log(`Returning ${reservations.length} reservations`)

    // 正しいフォーマットで返す（Cache-Controlヘッダー付き）
    let response = NextResponse.json({
      success: true,
      reservations: reservations,
      hasMore: reservations.length === limit,
      limit,
      offset,
      timestamp: new Date().toISOString()
    })
    response = setCacheHeaders(response, 'RESERVATIONS')
    response = addFreshnessHeaders(response)
    return setCorsHeaders(response)
  } catch (error: any) {
    console.error('Failed to fetch reservations:', error)
    console.error('Error stack:', error.stack)

    // エラーでも200で返してクライアント側の処理を継続
    return setCorsHeaders(NextResponse.json({
      success: false,
      error: error.message || '予約一覧の取得に失敗しました',
      reservations: []
    }, { status: 200 }))
  }
}

// 予約作成
export async function POST(request: NextRequest) {
  // 認証はオプショナル（ログインユーザーの場合はcustomerIdを自動設定）
  const authUser = await verifyAuth(request)

  const { data, error } = await validateRequestBody<{
    serviceType: '2D' | '3D' | '4D'
    serviceName: string
    price: number
    date: string
    time: string
    customerName: string
    customerPhone: string
    customerEmail: string
    notes?: string
    finalPrice?: number
    pointsUsed?: number
  }>(request, [
    'serviceType',
    'serviceName',
    'price',
    'date',
    'time',
    'customerName',
    'customerPhone',
    'customerEmail',
  ])

  if (error) return setCorsHeaders(error)

  try {
    // 予約可能な時間枠かチェック
    const slots = await reservationService.getTimeSlotsForDate(data.date)
    const selectedSlot = slots.find((slot) => slot.time === data.time)

    if (!selectedSlot || !selectedSlot.available) {
      return setCorsHeaders(errorResponse('選択された時間枠は予約できません', 400))
    }

    // 予約作成
    const reservation = await reservationService.createReservation({
      ...data,
      customerId: authUser?.userId || null, // ログインしている場合のみcustomerIdを設定
      status: 'pending',
      updatedAt: new Date(),
    })

    // 関連するキャッシュをクリア（Vercelのサーバーレス環境では実質無効）
    // メモリキャッシュは各インスタンスで独立しているため、一時的に無効化
    /*
    if (authUser?.userId) {
      // ユーザー用の全キャッシュをクリア（ページネーション対応）
      for (let offset = 0; offset <= 500; offset += 50) {
        await cacheService.delete(`reservations:user:${authUser.userId}:50:${offset}`)
      }
    }
    // 管理者用の全キャッシュをクリア（ページネーション対応）
    for (let offset = 0; offset <= 500; offset += 50) {
      await cacheService.delete(`reservations:admin:50:${offset}`)
    }
    await cacheService.delete(`availability:${data.date.substring(0, 7)}`)
    await cacheService.delete(`slots:${data.date}`)
    */

    return setCorsHeaders(successResponse(reservation, 201))
  } catch (error: any) {
    return setCorsHeaders(errorResponse(error.message || '予約の作成に失敗しました', 500))
  }
}
