'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { buildAdminAnalytics } from '@/lib/utils/analytics'

import type {
  ChartData,
  ServiceChartData,
  TierChartData,
  TimeSlotChartData,
  Reservation,
  User,
  Customer,
} from '@/lib/types'

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED330']

const mapReservationsForAnalytics = (reservations: Reservation[]) =>
  reservations.map((reservation) => ({
    dateIso: reservation.date,
    status: reservation.status,
    amount:
      reservation.finalPrice ?? reservation.totalPrice ?? reservation.price ?? reservation.maintenancePrice ?? 0,
    serviceName: reservation.serviceName,
    time: reservation.time,
    customerId: reservation.customerId ?? '',
  }))

const mapUsersForAnalytics = (users: User[]) =>
  users.map((user) => ({
    role: user.role,
    tier: (user as Customer).tier ?? 'bronze',
  }))

export default function AnalyticsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([])
  const [serviceData, setServiceData] = useState<ServiceChartData[]>([])
  const [customerTierData, setCustomerTierData] = useState<TierChartData[]>([])
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [isFallbackData, setIsFallbackData] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const applyAnalytics = useCallback((analytics: {
    monthlyRevenue: ChartData[]
    servicePerformance: ServiceChartData[]
    customerTierDistribution: TierChartData[]
    timeSlotDistribution: TimeSlotChartData[]
  }) => {
    setMonthlyData(analytics.monthlyRevenue)
    setServiceData(analytics.servicePerformance)
    setCustomerTierData(analytics.customerTierDistribution)
    setTimeSlotData(analytics.timeSlotDistribution)
  }, [])

  const loadAnalytics = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (options.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        setIsFallbackData(false)
        setErrorMessage(null)

        const response = await apiClient.getAdminStats()
        applyAnalytics(response.analytics)

        if (response.warning) {
          setErrorMessage(response.warning)
        }
        setIsFallbackData(Boolean(response.fallback))
      } catch (error) {
        console.error('Failed to load analytics:', error)

        const localReservations = storageService.getAllReservations() as Reservation[]
        const localUsers = storageService.getUsers() as User[]
        const analytics = buildAdminAnalytics(
          mapReservationsForAnalytics(localReservations),
          mapUsersForAnalytics(localUsers),
        )

        applyAnalytics(analytics)
        setIsFallbackData(true)
        setErrorMessage('Firestoreから分析データを取得できなかったため、ローカルの参考データを表示しています。')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [applyAnalytics],
  )

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    void loadAnalytics()
  }, [user, router, loadAnalytics])

  const handleReload = () => {
    void loadAnalytics({ silent: true })
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">売上・統計分析</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-md ${
              period === 'week'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            週間
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md ${
              period === 'month'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            月間
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-md ${
              period === 'year'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            年間
          </button>
        </div>
      </div>

      {isFallbackData && (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          <div>Firestoreとの接続に問題が発生したため、ローカルの参考データを表示しています。</div>
          <div className="mt-3">
            <button
              onClick={handleReload}
              disabled={refreshing}
              className="rounded-md border border-yellow-500 px-3 py-1 text-yellow-700 hover:bg-yellow-100 disabled:opacity-60"
            >
              {refreshing ? '再読込中…' : '再読込'}
            </button>
          </div>
        </div>
      )}

      {!isFallbackData && errorMessage && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div>{errorMessage}</div>
          <div className="mt-3">
            <button
              onClick={handleReload}
              disabled={refreshing}
              className="rounded-md border border-blue-400 px-3 py-1 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              {refreshing ? '再読込中…' : '最新データを取得'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">月別売上推移</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="売上" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="count" name="件数" stroke="#82ca9d" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">サービス別売上</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="売上" fill="#8884d8" />
              <Bar dataKey="count" name="件数" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">顧客ティア構成</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={customerTierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {customerTierData.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-xl font-bold mb-4">時間帯別予約分布</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeSlotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="予約件数" fill="#45B7D1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
