'use client'

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'


interface NavItem {
  name: string
  href: string
  icon: string
  badge?: number
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingInquiries, setPendingInquiries] = useState(0)
  const [pendingReservations, setPendingReservations] = useState(0)

  const navigation: NavItem[] = [
    { name: 'ダッシュボード', href: '/admin', icon: '📊' },
    { name: '予約管理', href: '/admin/reservations', icon: '📅', badge: pendingReservations },
    { name: '顧客管理', href: '/admin/customers', icon: '👥' },
    { name: 'ポイント管理', href: '/admin/points', icon: '⭐' },
    { name: '誕生日管理', href: '/admin/birthday', icon: '🎂' },
    { name: 'お問い合わせ', href: '/admin/inquiries', icon: '💬', badge: pendingInquiries },
    { name: '売上・統計', href: '/admin/analytics', icon: '📈' },
    { name: '設定', href: '/admin/settings', icon: '⚙️' },
  ]

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }

    // バッジの数を計算
    const inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]')
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]')

    setPendingInquiries(inquiries.filter((i: any) => i.status === 'unread').length)
    setPendingReservations(reservations.filter((r: any) => r.status === 'pending').length)
  }, [user, router, pathname])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* サイドバー（モバイル） */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="サイドバーを閉じる"
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-5">
            <h2 className="text-xl font-semibold">Bee Artena Admin</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-900"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md mb-1 ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="flex-shrink-0 px-4 py-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {/* サイドバー（デスクトップ） */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 bg-white shadow-lg">
          <div className="flex items-center justify-center px-4 py-5 border-b">
            <h2 className="text-xl font-semibold">Bee Artena Admin</h2>
          </div>
          <nav className="flex-1 px-2 py-4 bg-white">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md mb-1 ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="flex-shrink-0 px-4 py-4 border-t">
            <div className="flex items-center mb-3">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">管理者</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-col flex-1 lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center flex-1 px-4">
            <h1 className="text-lg font-semibold">管理画面</h1>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
