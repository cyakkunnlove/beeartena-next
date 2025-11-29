import {
  ChartData,
  ServiceChartData,
  TierChartData,
  TimeSlotChartData,
} from '@/lib/types'

// ローカルストレージなどの簡易データから管理画面用の集計を組み立てる軽量ユーティリティ。
// Firestore取得に失敗した際のフォールバックでのみ使用されるため、最低限の実装です。

type ReservationLite = {
  dateIso: string
  status: string
  amount: number
  serviceName: string
  time: string
  customerId: string
}

type UserLite = {
  role: string
  tier: string
}

export type AdminAnalyticsPayload = {
  monthlyRevenue: ChartData[]
  servicePerformance: ServiceChartData[]
  customerTierDistribution: TierChartData[]
  timeSlotDistribution: TimeSlotChartData[]
  fallback?: boolean
  warning?: string
}

export function buildAdminAnalytics(
  reservations: ReservationLite[],
  users: UserLite[],
): AdminAnalyticsPayload {
  // 月別売上
  const monthlyMap = new Map<string, number>()
  reservations.forEach((r) => {
    const monthKey = r.dateIso.slice(0, 7) // YYYY-MM
    const prev = monthlyMap.get(monthKey) || 0
    monthlyMap.set(monthKey, prev + (r.amount || 0))
  })
  const monthlyRevenue: ChartData[] = Array.from(monthlyMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
    count: reservations.filter((r) => r.dateIso.startsWith(month)).length,
  }))

  // サービス別
  const serviceMap = new Map<string, { revenue: number; count: number }>()
  reservations.forEach((r) => {
    const prev = serviceMap.get(r.serviceName) || { revenue: 0, count: 0 }
    serviceMap.set(r.serviceName, {
      revenue: prev.revenue + (r.amount || 0),
      count: prev.count + 1,
    })
  })
  const servicePerformance: ServiceChartData[] = Array.from(serviceMap.entries()).map(
    ([name, { revenue, count }]) => ({ name, revenue, count, value: revenue }),
  )

  // 顧客ティア
  const tierMap = new Map<string, number>()
  users.forEach((u) => tierMap.set(u.tier, (tierMap.get(u.tier) || 0) + 1))
  const customerTierDistribution: TierChartData[] = Array.from(tierMap.entries()).map(
    ([name, value]) => ({ name, value, fill: '#8884d8' }),
  )

  // 時間帯分布（HH:MMをHH:00に丸めてカウント）
  const slotMap = new Map<string, number>()
  reservations.forEach((r) => {
    const hour = r.time?.split(':')[0] || '00'
    slotMap.set(hour, (slotMap.get(hour) || 0) + 1)
  })
  const timeSlotDistribution: TimeSlotChartData[] = Array.from(slotMap.entries()).map(
    ([name, value]) => ({ name: `${name}:00`, value }),
  )

  return {
    monthlyRevenue,
    servicePerformance,
    customerTierDistribution,
    timeSlotDistribution,
  }
}
