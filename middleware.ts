import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // メンテナンスモードチェック
  const maintenanceModeValue = process.env.NEXT_PUBLIC_MAINTENANCE_MODE
  const isMaintenanceMode = maintenanceModeValue === 'true'

  // デバッグ用: 環境変数の値をコンソールに出力
  console.log('[Middleware Debug] NEXT_PUBLIC_MAINTENANCE_MODE:', maintenanceModeValue, 'isMaintenanceMode:', isMaintenanceMode)

  // システムメンテナンスページ自体へのアクセスは許可
  if (request.nextUrl.pathname === '/system-maintenance') {
    return NextResponse.next()
  }

  // メンテナンスモードの場合、すべてのアクセスをシステムメンテナンスページにリダイレクト
  if (isMaintenanceMode) {
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
