'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

import { useAuth } from '@/lib/auth/AuthContext'
import { User, Reservation, Inquiry } from '@/lib/types'

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
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

    const fetchStats = async () => {
      try {
        // Firebaseから実際のデータを取得
        // 顧客数を取得
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const customers = usersSnapshot.docs.filter(doc => {
          const data = doc.data()
          return data.role === 'customer' || !data.role // roleがない場合も顧客として扱う
        })

        // 予約を取得
        const reservationsSnapshot = await getDocs(collection(db, 'reservations'))
        const reservations = reservationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Reservation[]

        // お問い合わせを取得
        const inquiriesSnapshot = await getDocs(collection(db, 'inquiries'))
        const inquiries = inquiriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Inquiry[]

        const today = new Date().toISOString().split('T')[0]
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const todayRes = reservations.filter(r => r.date === today)
        const pendingRes = reservations.filter(r => r.status === 'pending')
        const unreadInq = inquiries.filter(i => i.status === 'unread')

        // アクティブ顧客（過去30日以内に予約があった顧客）
        const activeCustomerIds = new Set(
          reservations
            .filter(r => new Date(r.date) >= thirtyDaysAgo)
            .map(r => r.customerId)
            .filter(id => id !== null)
        )

        const monthlyRev = reservations
          .filter(r => {
            const resDate = new Date(r.date)
            return (
              resDate.getMonth() === currentMonth &&
              resDate.getFullYear() === currentYear &&
              r.status !== 'cancelled'
            )
          })
          .reduce((sum, r) => {
            // totalPriceがある場合はそれを使用、なければpriceを使用
            const amount = r.totalPrice || r.price || 0
            // finalPriceがある場合（ポイント利用後）はそれを使用
            const finalAmount = r.finalPrice || amount
            return sum + finalAmount
          }, 0)

        const totalRev = reservations
          .filter(r => r.status !== 'cancelled')
          .reduce((sum, r) => {
            const amount = r.totalPrice || r.price || 0
            const finalAmount = r.finalPrice || amount
            return sum + finalAmount
          }, 0)

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
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
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
      description: '予約枠・時間帯の設定',
      href: '/admin/settings',
      icon: '⚙️',
    },
    {
      title: '売上分析',
      description: '売上・予約データ分析',
      href: '/admin/analytics',
      icon: '📊',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
          <p className="text-gray-600 mt-2">BEE ART ENAの予約・顧客管理システム</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-full p-3 text-white text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">クイックアクション</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{action.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts/Notifications */}
        {(stats.pendingReservations > 0 || stats.unreadInquiries > 0) && (
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">対応が必要な項目があります</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {stats.pendingReservations > 0 && (
                      <li>承認待ちの予約が {stats.pendingReservations} 件あります</li>
                    )}
                    {stats.unreadInquiries > 0 && (
                      <li>未読のお問い合わせが {stats.unreadInquiries} 件あります</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}