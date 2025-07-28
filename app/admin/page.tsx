'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalReservations: 0,
    pendingReservations: 0,
    totalRevenue: 0,
    todayReservations: 0,
    monthlyRevenue: 0,
    unreadInquiries: 0,
    activeCustomers: 0,
  })

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    // Calculate stats from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]')
    const inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]')

    const today = new Date().toISOString().split('T')[0]
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const customers = users.filter((u: any) => u.role === 'customer')
    const todayRes = reservations.filter((r: any) => r.date === today)
    const pendingRes = reservations.filter((r: any) => r.status === 'pending')
    const unreadInq = inquiries.filter((i: any) => i.status === 'unread')

    // アクティブ顧客（過去30日以内に予約があった顧客）
    const activeCustomerIds = new Set(
      reservations
        .filter((r: any) => new Date(r.date) >= thirtyDaysAgo)
        .map((r: any) => r.customerId),
    )

    const monthlyRev = reservations
      .filter((r: any) => {
        const resDate = new Date(r.date)
        return (
          resDate.getMonth() === currentMonth &&
          resDate.getFullYear() === currentYear &&
          r.status !== 'cancelled'
        )
      })
      .reduce((sum: number, r: any) => sum + r.price, 0)

    const totalRev = reservations
      .filter((r: any) => r.status !== 'cancelled')
      .reduce((sum: number, r: any) => sum + r.price, 0)

    setStats({
      totalCustomers: customers.length,
      totalReservations: reservations.length,
      pendingReservations: pendingRes.length,
      totalRevenue: totalRev,
      todayReservations: todayRes.length,
      monthlyRevenue: monthlyRev,
      unreadInquiries: unreadInq.length,
      activeCustomers: activeCustomerIds.size,
    })
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  const statCards = [
    {
      title: '総顧客数',
      value: stats.totalCustomers,
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: '総予約数',
      value: stats.totalReservations,
      icon: '📅',
      color: 'bg-green-500',
    },
    {
      title: '本日の予約',
      value: stats.todayReservations,
      icon: '📆',
      color: 'bg-purple-500',
    },
    {
      title: '承認待ち予約',
      value: stats.pendingReservations,
      icon: '⏳',
      color: 'bg-yellow-500',
    },
    {
      title: '月間売上',
      value: `¥${stats.monthlyRevenue.toLocaleString()}`,
      icon: '💰',
      color: 'bg-pink-500',
    },
    {
      title: '総売上',
      value: `¥${stats.totalRevenue.toLocaleString()}`,
      icon: '💴',
      color: 'bg-indigo-500',
    },
  ]

  const quickActions = [
    {
      title: '予約管理',
      description: '予約の確認・管理',
      href: '/admin/reservations',
      icon: '📅',
    },
    {
      title: '顧客管理',
      description: '顧客情報の閲覧・編集',
      href: '/admin/customers',
      icon: '👥',
    },
    {
      title: 'ポイント管理',
      description: 'ポイント付与・履歴',
      href: '/admin/points',
      icon: '⭐',
    },
    {
      title: 'お問い合わせ',
      description: '未対応のお問い合わせ',
      href: '/admin/inquiries',
      icon: '💬',
    },
    {
      title: '予約設定',
      description: '営業時間・休業日設定',
      href: '/admin/settings',
      icon: '⚙️',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">管理画面</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} bg-opacity-20 p-3 rounded-lg`}>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold mb-6">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">{action.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
              <p className="text-gray-600 text-sm">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">最近のアクティビティ</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🆕</span>
                <div>
                  <p className="font-medium">新規予約</p>
                  <p className="text-sm text-gray-600">山田花子様 - 4Dパウダー&フェザー</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">5分前</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium">新規会員登録</p>
                  <p className="text-sm text-gray-600">佐藤太郎様</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">1時間前</p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-medium">新規お問い合わせ</p>
                  <p className="text-sm text-gray-600">アートメイクについて</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">3時間前</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
