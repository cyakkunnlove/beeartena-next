import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ビルド時に環境変数の値が埋め込まれる
const IS_MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

export function middleware(request: NextRequest) {
  // デバッグ用: ビルド時の値を出力
  console.log('[Middleware Debug] IS_MAINTENANCE_MODE (build-time):', IS_MAINTENANCE_MODE)

  // APIルートはメンテナンスモードでもブロックしない（Webhook等が止まるため）
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // システムメンテナンスページ自体へのアクセスは許可
  if (request.nextUrl.pathname === '/system-maintenance') {
    return NextResponse.next()
  }

  // メンテナンスモードの場合、すべてのアクセスをシステムメンテナンスページにリダイレクト
  if (IS_MAINTENANCE_MODE) {
    console.log('[Middleware] Redirecting to maintenance page')
    return NextResponse.rewrite(new URL('/system-maintenance', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
