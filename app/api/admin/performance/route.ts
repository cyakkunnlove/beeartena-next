import { NextRequest, NextResponse } from 'next/server'

import { verifyAuth } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

interface PerformanceMetrics {
  endpoint: string
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  totalRequests: number
  avgDataSize: number
  timestamp: Date
}

// メモリ内でメトリクスを保存（本番環境ではRedisやFirestoreを使用）
const metricsCache = new Map<string, PerformanceMetrics[]>()

export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request)

  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDb()

    if (!db) {
      return NextResponse.json({
        performanceMetrics: [],
        recommendations: [],
        indexStatus: {
          existing: [],
          recommended: [],
        },
        summary: {
          avgResponseTime: 0,
          totalDataTransfer: '0KB',
        },
        warning: 'Firebase admin is not configured; returning empty metrics.',
      })
    }
    const now = new Date()

    // Firestoreから実際のクエリ実行時間を分析
    const testQueries = [
      {
        name: 'reservations_admin',
        query: db.collection('reservations')
          .orderBy('date', 'desc')
          .limit(50)
      },
      {
        name: 'reservations_user',
        query: db.collection('reservations')
          .where('customerId', '==', 'test-user-id')
          .orderBy('date', 'desc')
          .limit(50)
      },
      {
        name: 'availability_check',
        query: db.collection('reservations')
          .where('date', '>=', '2025-01-01')
          .where('date', '<=', '2025-01-31')
          .where('status', 'in', ['pending', 'confirmed'])
      }
    ]

    const results = []

    for (const test of testQueries) {
      const startTime = Date.now()

      try {
        const snapshot = await test.query.get()
        const endTime = Date.now()
        const responseTime = endTime - startTime

        // データサイズを計算
        let dataSize = 0
        snapshot.docs.forEach(doc => {
          dataSize += JSON.stringify(doc.data()).length
        })

        results.push({
          query: test.name,
          responseTime,
          documentCount: snapshot.docs.length,
          totalDataSize: (dataSize / 1024).toFixed(2) + 'KB',
          avgDocSize: snapshot.docs.length > 0
            ? ((dataSize / snapshot.docs.length) / 1024).toFixed(2) + 'KB'
            : '0KB',
          timestamp: new Date().toISOString()
        })
      } catch (error: any) {
        results.push({
          query: test.name,
          error: error.message,
          timestamp: new Date().toISOString()
        })
      }
    }

    // 推奨事項を生成
    const recommendations = []

    for (const result of results) {
      if ('responseTime' in result && result.responseTime && result.responseTime > 1000) {
        recommendations.push({
          query: result.query,
          issue: 'Slow query performance',
          recommendation: 'Consider adding appropriate indexes or reducing query complexity',
          severity: 'high'
        })
      }

      if ('avgDocSize' in result && result.avgDocSize && parseFloat(result.avgDocSize) > 5) {
        recommendations.push({
          query: result.query,
          issue: 'Large document size',
          recommendation: 'Consider using .select() to fetch only required fields',
          severity: 'medium'
        })
      }
    }

    // インデックス状況を確認
    const indexStatus = {
      existing: [
        'reservations: customerId ASC, date DESC',
        'reservations: date ASC, status ASC',
        'reservations: date ASC, time ASC'
      ],
      recommended: [] as string[]
    }

    // .select()を使用する場合に必要なインデックス
    if (results.some(r => 'avgDocSize' in r && r.avgDocSize && parseFloat(r.avgDocSize) > 3)) {
      indexStatus.recommended.push(
        'reservations: customerId ASC, date DESC (with fields: date, time, status)',
        'This index would allow using .select() to reduce data transfer'
      )
    }

    const responseTimeEntries = results.filter((r) => 'responseTime' in r && r.responseTime) as Array<{
      responseTime: number
    }>
    const totalDataEntries = results.filter((r) => 'totalDataSize' in r && r.totalDataSize) as Array<{
      totalDataSize: string
    }>

    const avgResponseTime = responseTimeEntries.length
      ? responseTimeEntries.reduce((acc, r) => acc + (r.responseTime || 0), 0) / responseTimeEntries.length
      : 0

    const totalDataTransferValue = totalDataEntries.length
      ? totalDataEntries.reduce((acc, r) => acc + parseFloat(r.totalDataSize || '0'), 0)
      : 0

    return NextResponse.json({
      performanceMetrics: results,
      recommendations,
      indexStatus,
      summary: {
        avgResponseTime,
        totalDataTransfer: `${totalDataTransferValue.toFixed(2)}KB`,
      },
    })
  } catch (error: any) {
    console.error('Performance monitoring error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// パフォーマンスメトリクスを記録するエンドポイント
export async function POST(request: NextRequest) {
  const authUser = await verifyAuth(request)

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint, responseTime, dataSize } = await request.json()

    // メトリクスを記録（本番環境ではFirestoreやRedisに保存）
    const metrics = metricsCache.get(endpoint) || []
    metrics.push({
      endpoint,
      avgResponseTime: responseTime,
      maxResponseTime: responseTime,
      minResponseTime: responseTime,
      totalRequests: 1,
      avgDataSize: dataSize,
      timestamp: new Date()
    })

    // 最新100件のみ保持
    if (metrics.length > 100) {
      metrics.shift()
    }

    metricsCache.set(endpoint, metrics)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}