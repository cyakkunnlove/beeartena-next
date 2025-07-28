'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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

import { useAuth } from '@/lib/auth/AuthContext'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [serviceData, setServiceData] = useState<any[]>([])
  const [customerTierData, setCustomerTierData] = useState<any[]>([])
  const [timeSlotData, setTimeSlotData] = useState<any[]>([])

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin')
      return
    }

    // データの集計
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]')
    const users = JSON.parse(localStorage.getItem('users') || '[]')

    // 月別売上データ
    const now = new Date()
    const monthlyRevenue: { [key: string]: number } = {}
    const monthlyCount: { [key: string]: number } = {}

    // 過去12ヶ月のデータを集計
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenue[monthKey] = 0
      monthlyCount[monthKey] = 0
    }

    reservations
      .filter((r: any) => r.status !== 'cancelled')
      .forEach((r: any) => {
        const date = new Date(r.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += r.price || 0
          monthlyCount[monthKey]++
        }
      })

    const monthlyDataArray = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month: month.split('-')[1] + '月',
      revenue,
      count: monthlyCount[month],
    }))

    setMonthlyData(monthlyDataArray)

    // サービス別売上データ
    const serviceRevenue: { [key: string]: number } = {}
    const serviceCount: { [key: string]: number } = {}

    reservations
      .filter((r: any) => r.status !== 'cancelled')
      .forEach((r: any) => {
        const service = r.serviceName || 'その他'
        serviceRevenue[service] = (serviceRevenue[service] || 0) + (r.price || 0)
        serviceCount[service] = (serviceCount[service] || 0) + 1
      })

    const serviceDataArray = Object.entries(serviceRevenue).map(([name, revenue]) => ({
      name,
      revenue,
      count: serviceCount[name],
    }))

    setServiceData(serviceDataArray)

    // 顧客ティア別データ
    const tierCounts = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    }

    users
      .filter((u: any) => u.role === 'customer')
      .forEach((u: any) => {
        const tier = u.tier || 'bronze'
        tierCounts[tier as keyof typeof tierCounts]++
      })

    const tierDataArray = Object.entries(tierCounts).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
    }))

    setCustomerTierData(tierDataArray)

    // 時間帯別予約データ
    const timeSlots: { [key: string]: number } = {}

    reservations.forEach((r: any) => {
      const time = r.time || '不明'
      timeSlots[time] = (timeSlots[time] || 0) + 1
    })

    const timeSlotDataArray = Object.entries(timeSlots)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({
        time,
        count,
      }))

    setTimeSlotData(timeSlotDataArray)
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED330']

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

      {/* 月別売上推移 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">月別売上推移</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#FF6B6B"
              name="売上（円）"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#4ECDC4"
              name="予約数"
              strokeWidth={2}
              yAxisId="right"
            />
            <YAxis yAxisId="right" orientation="right" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* サービス別売上 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">サービス別売上</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#45B7D1" name="売上（円）" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 顧客ティア分布 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">顧客ティア分布</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerTierData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {customerTierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 時間帯別予約数 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">時間帯別予約数</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeSlotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#FED330" name="予約数" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">平均単価</h3>
          <p className="text-2xl font-bold text-primary">
            ¥
            {Math.round(
              serviceData.reduce((sum, s) => sum + s.revenue, 0) /
                serviceData.reduce((sum, s) => sum + s.count, 0) || 0,
            ).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">リピート率</h3>
          <p className="text-2xl font-bold text-green-600">78%</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">予約完了率</h3>
          <p className="text-2xl font-bold text-blue-600">92%</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">顧客満足度</h3>
          <p className="text-2xl font-bold text-yellow-600">4.8/5.0</p>
        </div>
      </div>
    </div>
  )
}
