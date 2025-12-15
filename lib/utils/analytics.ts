import type {
  ChartData,
  ServiceChartData,
  TierChartData,
  TimeSlotChartData,
} from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
}

export interface AnalyticsReservationRecord {
  dateIso?: string | null
  status?: string | null
  amount?: number | null
  serviceName?: string | null
  time?: string | null
}

export interface AnalyticsCustomerRecord {
  role?: string | null
  tier?: string | null
  deleted?: boolean | null
}

export interface AdminAnalyticsPayload {
  monthlyRevenue: ChartData[]
  servicePerformance: ServiceChartData[]
  customerTierDistribution: TierChartData[]
  timeSlotDistribution: TimeSlotChartData[]
}

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const createMonthlyBuckets = () => {
  const now = new Date()
  const buckets: { [key: string]: { revenue: number; count: number } } = {}

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = { revenue: 0, count: 0 }
  }

  return buckets
}

const isCancelled = (status?: string | null) => {
  if (!status) {
    return false
  }
  const normalized = status.toLowerCase()
  return normalized === 'cancelled' || normalized === 'canceled'
}

export const buildAdminAnalytics = (
  reservations: AnalyticsReservationRecord[],
  customers: AnalyticsCustomerRecord[],
): AdminAnalyticsPayload => {
  const monthlyBuckets = createMonthlyBuckets()
  const serviceBuckets = new Map<string, { revenue: number; count: number }>()
  const tierBuckets: Record<string, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  }
  const timeSlotBuckets = new Map<string, number>()

  reservations.forEach((entry) => {
    if (isCancelled(entry.status)) {
      return
    }

    const amount = Number.isFinite(entry.amount ?? Number.NaN) ? Number(entry.amount) : 0
    const date = parseDate(entry.dateIso ?? null)

    if (date) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyBuckets[key]) {
        monthlyBuckets[key].revenue += amount
        monthlyBuckets[key].count += 1
      }
    }

    const serviceName = (entry.serviceName ?? '').trim() || 'その他'
    const service = serviceBuckets.get(serviceName) ?? { revenue: 0, count: 0 }
    service.revenue += amount
    service.count += 1
    serviceBuckets.set(serviceName, service)

    const timeKey = (entry.time ?? '').trim() || '不明'
    timeSlotBuckets.set(timeKey, (timeSlotBuckets.get(timeKey) ?? 0) + 1)
  })

  customers.forEach((customer) => {
    if (customer.deleted) {
      return
    }
    const role = (customer.role ?? '').toLowerCase()
    if (role !== '' && role !== 'customer') {
      return
    }
    const tier = (customer.tier ?? '').toLowerCase()
    const key = tierBuckets[tier] !== undefined ? tier : 'bronze'
    tierBuckets[key] += 1
  })

  const monthlyRevenue: ChartData[] = Object.entries(monthlyBuckets).map(([key, value]) => {
    const [, month] = key.split('-')
    return {
      month: `${month}月`,
      revenue: Number(value.revenue.toFixed(2)),
      count: value.count,
    }
  })

  const servicePerformance: ServiceChartData[] = Array.from(serviceBuckets.entries())
    .map(([name, value]) => ({
      name,
      revenue: Number(value.revenue.toFixed(2)),
      count: value.count,
      value: Number(value.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const tierEntries = Object.entries(tierBuckets)
  const customerTierDistribution: TierChartData[] = tierEntries.map(([tier, count]) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: count,
    fill: TIER_COLORS[tier] ?? '#CBD5F5',
  }))

  const timeSlotDistribution: TimeSlotChartData[] = Array.from(timeSlotBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, value: count }))

  return {
    monthlyRevenue,
    servicePerformance,
    customerTierDistribution,
    timeSlotDistribution,
  }
}
