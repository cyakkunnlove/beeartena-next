// Vercelサーバーレス環境でのキャッシュ戦略
//
// 問題：
// - Vercelは各リクエストを独立したインスタンスで処理
// - メモリキャッシュは共有されない
// - キャッシュ無効化が他のインスタンスに伝播しない
//
// 解決策：
// 1. 短期: 極短TTL（5-10秒）+ Cache-Controlヘッダー
// 2. 中期: Vercel KV または Upstash Redis
// 3. 長期: Next.js ISR + On-Demand Revalidation

export const CACHE_STRATEGY = {
  // 予約一覧: 頻繁に変更される可能性がある
  RESERVATIONS: {
    TTL: 10, // 10秒（極短）
    STALE_WHILE_REVALIDATE: 5, // 5秒
    CDN_MAX_AGE: 5, // CDNキャッシュ5秒
  },

  // 空き状況: リアルタイム性が重要
  AVAILABILITY: {
    TTL: 5, // 5秒（超短期）
    STALE_WHILE_REVALIDATE: 2, // 2秒
    CDN_MAX_AGE: 0, // CDNキャッシュなし
  },

  // タイムスロット: 日次で固定
  TIME_SLOTS: {
    TTL: 3600, // 1時間
    STALE_WHILE_REVALIDATE: 300, // 5分
    CDN_MAX_AGE: 300, // CDNキャッシュ5分
  },
}

import { NextResponse } from 'next/server'

// キャッシュヘッダーを設定（NextResponse用）
export function setCacheHeaders<T>(response: NextResponse<T>, strategy: keyof typeof CACHE_STRATEGY): NextResponse<T> {
  const config = CACHE_STRATEGY[strategy]

  // Cache-Controlヘッダーを設定
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${config.CDN_MAX_AGE}, stale-while-revalidate=${config.STALE_WHILE_REVALIDATE}`
  )

  // Surrogate-Controlヘッダー（Vercel Edge Network用）
  response.headers.set(
    'Surrogate-Control',
    `max-age=${config.CDN_MAX_AGE}, stale-while-revalidate=${config.STALE_WHILE_REVALIDATE}`
  )

  return response
}

// データの新しさを示すタイムスタンプを含める（NextResponse用）
export function addFreshnessHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('X-Data-Timestamp', new Date().toISOString())
  response.headers.set('X-Cache-Strategy', 'short-ttl-with-swr')
  return response
}