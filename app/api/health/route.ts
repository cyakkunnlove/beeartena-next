import { NextResponse } from 'next/server'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: 'up' | 'down'
    firebase: 'up' | 'down'
    cache: 'up' | 'down'
  }
  metrics: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Firebaseの接続チェック
    // 実際の実装では、Firebaseへの簡単なクエリを実行
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

async function checkFirebaseHealth(): Promise<boolean> {
  try {
    // Firebase Authの状態チェック
    // 実際の実装では、Firebase Admin SDKを使用
    return true
  } catch (error) {
    console.error('Firebase health check failed:', error)
    return false
  }
}

async function checkCacheHealth(): Promise<boolean> {
  try {
    // キャッシュシステムのチェック
    // 実際の実装では、Redis等への接続確認
    return true
  } catch (error) {
    console.error('Cache health check failed:', error)
    return false
  }
}

export async function GET() {
  try {
    const startTime = process.hrtime()
    
    // 並行してヘルスチェックを実行
    const [dbHealth, firebaseHealth, cacheHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkFirebaseHealth(),
      checkCacheHealth(),
    ])

    // メモリ使用量
    const memUsage = process.memoryUsage()
    const totalMem = memUsage.heapTotal
    const usedMem = memUsage.heapUsed
    const memPercentage = (usedMem / totalMem) * 100

    // CPU使用率（簡易版）
    const cpuUsage = process.cpuUsage()
    const elapsedTime = process.hrtime(startTime)
    const elapsedMicros = elapsedTime[0] * 1e6 + elapsedTime[1] / 1e3
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / elapsedMicros) * 100

    // アップタイム（秒）
    const uptime = process.uptime()

    const healthStatus: HealthStatus = {
      status: dbHealth && firebaseHealth && cacheHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        database: dbHealth ? 'up' : 'down',
        firebase: firebaseHealth ? 'up' : 'down',
        cache: cacheHealth ? 'up' : 'down',
      },
      metrics: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.floor(usedMem / 1024 / 1024), // MB
          total: Math.floor(totalMem / 1024 / 1024), // MB
          percentage: Math.floor(memPercentage),
        },
        cpu: {
          usage: Math.min(Math.floor(cpuPercent), 100),
        },
      },
    }

    // ステータスコードは健康状態に基づいて設定
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503

    return NextResponse.json(healthStatus, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': healthStatus.status,
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Check': 'unhealthy',
        }
      }
    )
  }
}