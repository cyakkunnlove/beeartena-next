import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // メンテナンスモードチェック
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

  // システムメンテナンスページ自体へのアクセスは許可
  if (request.nextUrl.pathname === '/system-maintenance') {
    return NextResponse.next()
  }

  // メンテナンスモードの場合、すべてのアクセスをシステムメンテナンスページにリダイレクト
  if (isMaintenanceMode) {
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
