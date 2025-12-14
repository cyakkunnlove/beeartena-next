const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

import type {
  Announcement,
  Customer,
  Reservation,
  ReservationSettings,
  ServicePlan,
  Inquiry,
  LineConversation,
  LineMessage,
} from '@/lib/types'
import type { AdminAnalyticsPayload } from '@/lib/utils/analytics'

type FirestoreDateInput =
  | string
  | Date
  | {
      toDate?: () => Date
      seconds?: number
      nanoseconds?: number
    }

export type AdminReservationRecord = Omit<
  Reservation,
  'createdAt' | 'updatedAt' | 'completedAt' | 'cancelledAt'
> & {
  createdAt?: FirestoreDateInput
  updatedAt?: FirestoreDateInput
  completedAt?: FirestoreDateInput | null
  cancelledAt?: FirestoreDateInput | null
  intakeForm?: Reservation['intakeForm']
}

export type AdminServicePlanRecord = Omit<
  ServicePlan,
  'createdAt' | 'updatedAt' | 'effectiveFrom' | 'effectiveUntil' | 'displayOrder' | 'duration' | 'price' | 'monitorPrice' | 'otherShopPrice'
> & {
  createdAt?: FirestoreDateInput
  updatedAt?: FirestoreDateInput
  effectiveFrom?: FirestoreDateInput
  effectiveUntil?: FirestoreDateInput | null
  displayOrder?: number | string
  duration?: number | string
  price?: number | string
  monitorPrice?: number | string | null
  otherShopPrice?: number | string | null
}

export type AdminInquiryRecord = {
  id?: string
  name?: unknown
  email?: unknown
  phone?: unknown
  type?: unknown
  message?: unknown
  status?: unknown
  reply?: unknown
  createdAt?: FirestoreDateInput
  updatedAt?: FirestoreDateInput
  repliedAt?: FirestoreDateInput | null
}

export type AdminCustomerRecord = {
  id?: string
  name?: unknown
  email?: unknown
  phone?: unknown
  role?: unknown
  birthday?: unknown
  birthDate?: unknown
  gender?: unknown
  tier?: unknown
  points?: unknown
  lifetimePoints?: unknown
  totalSpent?: unknown
  tags?: unknown
  notes?: unknown
  lastBirthdayPointsYear?: unknown
  address?: unknown
  postalCode?: unknown
  prefecture?: unknown
  city?: unknown
  street?: unknown
  createdAt?: FirestoreDateInput
  updatedAt?: FirestoreDateInput
}

export interface AdminStatsOverview {
  totalCustomers: number
  totalReservations: number
  pendingReservations: number
  totalRevenue: number
  todayReservations: number
  monthlyRevenue: number
  unreadInquiries: number
  activeCustomers: number
}

export type AdminPerformanceEntrySuccess = {
  query: string
  responseTimeMs: number
  documentCount: number
  totalDataSizeKb: number
  avgDocumentSizeKb: number
  timestamp: string
}

export type AdminPerformanceEntryError = {
  query: string
  error: string
  timestamp: string
}

export type AdminPerformanceEntry =
  | AdminPerformanceEntrySuccess
  | AdminPerformanceEntryError

export type AdminPerformanceRecommendation = {
  query: string
  issue: string
  recommendation: string
  severity: 'low' | 'medium' | 'high'
}

export interface AdminPerformanceIndexStatus {
  existing: string[]
  recommended: string[]
}

export interface AdminPerformanceSummary {
  avgResponseTimeMs: number
  totalDataTransferKb: number
  avgResponseTimeHuman: string
  totalDataTransferHuman: string
}

export interface AdminStatsResponse {
  stats: AdminStatsOverview
  analytics?: AdminAnalyticsPayload
  performanceMetrics?: AdminPerformanceEntry[]
  recommendations?: AdminPerformanceRecommendation[]
  indexStatus?: AdminPerformanceIndexStatus
  summary?: AdminPerformanceSummary
  warning?: string
  fallback?: boolean
  awaitingReservations?: number
  generatedAt?: string
  cached?: boolean
  source?: string
}

export const isAdminPerformanceError = (
  entry: AdminPerformanceEntry,
): entry is AdminPerformanceEntryError => 'error' in entry

export interface AdminReservationProcessResult {
  success: boolean
  processedCount: number
  pointsTotal: number
  processed: Array<{ reservationId: string; pointsAwarded: number }>
  skipped: Array<{ reservationId: string; reason: string }>
  errors: Array<{ reservationId: string; error: string }>
  message?: string
}

export interface AdminCreateCustomerPayload {
  name: string
  email?: string
  phone?: string
  birthday?: string
  birthDate?: string
  gender?: string
  notes?: string
  tags?: string[]
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface AdminCreateReservationPayload {
  customerId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  serviceId?: string
  serviceName: string
  serviceType: string
  price: number
  maintenanceOptions?: string[]
  maintenancePrice?: number
  totalPrice?: number
  date: string
  time: string
  durationMinutes?: number
  notes?: string
  status?: Reservation['status']
  finalPrice?: number
  pointsUsed?: number
  cancelReason?: string
  isMonitor?: boolean
  allowConflict?: boolean
}

const toDateValue = (value?: FirestoreDateInput | null): Date | null => {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number }
    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        const parsed = maybeTimestamp.toDate()
        return Number.isNaN(parsed.getTime()) ? null : parsed
      } catch {
        return null
      }
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      const seconds = maybeTimestamp.seconds
      const nanos = maybeTimestamp.nanoseconds ?? 0
      return new Date(seconds * 1000 + nanos / 1_000_000)
    }
  }
  return null
}

const toIsoString = (value?: FirestoreDateInput | null, fallback?: string): string | undefined => {
  const parsed = toDateValue(value)
  if (parsed) {
    return parsed.toISOString()
  }
  return fallback
}

const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const toOptionalNumberValue = (value: unknown): number | undefined => {
  const parsed = toNumberValue(value, Number.NaN)
  return Number.isNaN(parsed) ? undefined : parsed
}

const DEFAULT_ADMIN_ANALYTICS_PAYLOAD: AdminAnalyticsPayload = {
  monthlyRevenue: [],
  servicePerformance: [],
  customerTierDistribution: [],
  timeSlotDistribution: [],
}

const DEFAULT_ADMIN_PERFORMANCE_SUMMARY: AdminPerformanceSummary = {
  avgResponseTimeMs: 0,
  totalDataTransferKb: 0,
  avgResponseTimeHuman: '0ms',
  totalDataTransferHuman: '0.00KB',
}

const DEFAULT_ADMIN_STATS_OVERVIEW: AdminStatsOverview = {
  totalCustomers: 0,
  totalReservations: 0,
  pendingReservations: 0,
  totalRevenue: 0,
  todayReservations: 0,
  monthlyRevenue: 0,
  unreadInquiries: 0,
  activeCustomers: 0,
}

const toStringValueSafe = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value.trim()
  }
  return fallback
}

const toOptionalStringValueSafe = (value: unknown): string | undefined => {
  const parsed = toStringValueSafe(value)
  return parsed.length > 0 ? parsed : undefined
}

const toNonNegativeNumberValue = (value: unknown): number => {
  const parsed = toNumberValue(value, 0)
  return parsed < 0 ? 0 : parsed
}

const CUSTOMER_TIER_VALUES = ['bronze', 'silver', 'gold', 'platinum'] as const
const CUSTOMER_TIER_SET = new Set<string>(CUSTOMER_TIER_VALUES)

const toTierValueSafe = (value: unknown): Customer['tier'] => {
  if (typeof value === 'string') {
    const lowercase = value.toLowerCase()
    if (CUSTOMER_TIER_SET.has(lowercase)) {
      return lowercase as Customer['tier']
    }
  }
  return 'bronze'
}

const toStringArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0)
  }
  return []
}

const buildAddressValue = (value: unknown): Customer['address'] | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const record = value as Record<string, unknown>
  const street = toOptionalStringValueSafe(record.street)
  const city = toOptionalStringValueSafe(record.city)
  const prefecture = toOptionalStringValueSafe(record.prefecture)
  const postalCode = toOptionalStringValueSafe(record.postalCode)

  if (street || city || prefecture || postalCode) {
    return { street, city, prefecture, postalCode }
  }

  return undefined
}

const buildAddressFromFields = (record: AdminCustomerRecord): Customer['address'] | undefined => {
  const street = toOptionalStringValueSafe(record.street)
  const city = toOptionalStringValueSafe(record.city)
  const prefecture = toOptionalStringValueSafe(record.prefecture)
  const postalCode = toOptionalStringValueSafe(record.postalCode)

  if (street || city || prefecture || postalCode) {
    return { street, city, prefecture, postalCode }
  }

  return undefined
}

const normalizeCustomerRecord = (record: AdminCustomerRecord): Customer => {
  const createdAt = toDateValue(record.createdAt) ?? new Date()
  const updatedAt = toDateValue(record.updatedAt) ?? createdAt
  const tier = toTierValueSafe(record.tier)
  const address = buildAddressValue(record.address) ?? buildAddressFromFields(record)

  const customer: Customer = {
    id: record.id ?? '',
    email: toStringValueSafe(record.email),
    name: toStringValueSafe(record.name),
    phone: toStringValueSafe(record.phone),
    role: 'customer',
    createdAt,
    updatedAt,
    tier,
  }

  const birthday = toOptionalStringValueSafe(record.birthday)
  if (birthday) {
    customer.birthday = birthday
  }

  const birthDate = toOptionalStringValueSafe(record.birthDate)
  if (birthDate) {
    customer.birthDate = birthDate
  }

  const gender = toOptionalStringValueSafe(record.gender)
  if (gender) {
    customer.gender =
      gender === 'male' || gender === 'female' || gender === 'other' ? gender : 'other'
  }

  const points = toNonNegativeNumberValue(record.points)
  customer.points = points

  const totalSpent = toNonNegativeNumberValue(record.totalSpent)
  customer.totalSpent = totalSpent

  const lifetimePoints = toNonNegativeNumberValue(record.lifetimePoints)
  customer.lifetimePoints = lifetimePoints

  const tags = toStringArrayValue(record.tags)
  if (tags.length > 0) {
    customer.tags = tags
  }

  const notes = toOptionalStringValueSafe(record.notes)
  if (notes) {
    customer.notes = notes
  }

  if (address) {
    customer.address = address
  }

  const postalCode = toOptionalStringValueSafe(record.postalCode)
  if (postalCode) {
    customer.postalCode = postalCode
  }

  const prefecture = toOptionalStringValueSafe(record.prefecture)
  if (prefecture) {
    customer.prefecture = prefecture
  }

  const city = toOptionalStringValueSafe(record.city)
  if (city) {
    customer.city = city
  }

  const street = toOptionalStringValueSafe(record.street)
  if (street) {
    customer.street = street
  }

  if (
    typeof record.lastBirthdayPointsYear === 'number' &&
    Number.isFinite(record.lastBirthdayPointsYear)
  ) {
    customer.lastBirthdayPointsYear = Math.trunc(record.lastBirthdayPointsYear)
  }

  return customer
}

const normalizeServicePlanRecord = (record: AdminServicePlanRecord): ServicePlan => {
  const nowIso = new Date().toISOString()
  const effectiveFrom = toIsoString(record.effectiveFrom, nowIso) ?? nowIso
  const effectiveUntil = toIsoString(record.effectiveUntil ?? null)
  const createdAt = toIsoString(record.createdAt, nowIso) ?? nowIso
  const updatedAt = toIsoString(record.updatedAt, nowIso) ?? nowIso

  return {
    id: record.id ?? '',
    name: record.name ?? '',
    description: record.description ?? '',
    type: record.type ?? '2D',
    price: toNumberValue(record.price, 0),
    monitorPrice: toOptionalNumberValue(record.monitorPrice ?? undefined),
    otherShopPrice: toOptionalNumberValue(record.otherShopPrice ?? undefined),
    duration: toNumberValue(record.duration, 0),
    image: typeof record.image === 'string' ? record.image : undefined,
    badge: typeof record.badge === 'string' ? record.badge : undefined,
    isFeatured: Boolean(record.isFeatured),
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : undefined,
    isPublished: Boolean(record.isPublished),
    effectiveFrom,
    effectiveUntil,
    displayOrder: toNumberValue(record.displayOrder, 1),
    createdAt,
    updatedAt,
  }
}

const normalizeAdminInquiryRecord = (record: AdminInquiryRecord): Inquiry => {
  const createdAt = toDateValue(record.createdAt) ?? new Date()
  const updatedAt = toDateValue(record.updatedAt) ?? createdAt

  const typeCandidates: Inquiry['type'][] = ['general', 'menu', 'booking', 'aftercare', 'other']
  const statusCandidates: Inquiry['status'][] = ['unread', 'read', 'replied']

  const type =
    typeof record.type === 'string' && typeCandidates.includes(record.type as Inquiry['type'])
      ? (record.type as Inquiry['type'])
      : 'other'

  const status =
    typeof record.status === 'string' && statusCandidates.includes(record.status as Inquiry['status'])
      ? (record.status as Inquiry['status'])
      : 'unread'

  return {
    id: typeof record.id === 'string' && record.id ? record.id : String(record.id ?? ''),
    name: typeof record.name === 'string' ? record.name : '',
    email: typeof record.email === 'string' ? record.email : '',
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    type,
    message: typeof record.message === 'string' ? record.message : '',
    status,
    createdAt,
    updatedAt,
  }
}

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token')
      const sanitized = this.sanitizeToken(storedToken)
      this.token = sanitized

      if (sanitized && sanitized !== storedToken) {
        localStorage.setItem('auth_token', sanitized)
      } else if (!sanitized && storedToken) {
        localStorage.removeItem('auth_token')
      }
    }
  }

  private sanitizeToken(rawToken?: string | null): string | null {
    if (!rawToken) return null
    const trimmed = rawToken.trim()
    if (!trimmed) return null
    const withoutPrefix = trimmed.replace(/^(Bearer\s+)+/i, '')
    return withoutPrefix || null
  }

  setToken(token: string) {
    const sanitized = this.sanitizeToken(token)
    this.token = sanitized
    if (typeof window !== 'undefined') {
      if (sanitized) {
        localStorage.setItem('auth_token', sanitized)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private resolveUrl(endpoint: string) {
    return API_BASE_URL ? `${API_BASE_URL}/api${endpoint}` : `/api${endpoint}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<T> {
    const url = this.resolveUrl(endpoint)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401 && requireAuth) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('認証が必要です')
    }

    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'リクエストに失敗しました')
    }

    return data as T
  }

  // 認証関連
  async login(email: string, password: string) {
    const response = await this.request<{ user: unknown; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    this.setToken(response.token)
    return response.user
  }

  async register(data: {
    email: string
    password: string
    name: string
    phone: string
    birthday?: string
  }) {
    const response = await this.request<{ user: unknown; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    this.setToken(response.token)
    return response.user
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' })
    this.clearToken()
  }

  async getCurrentUser() {
    return this.request<Record<string, unknown>>('/auth/me')
  }

  async updateProfile(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 管理者ダッシュボード
  async getAdminStats(options: { forceRefresh?: boolean } = {}) {
    const endpoint = options.forceRefresh ? '/admin/stats?refresh=1' : '/admin/stats'
    const response = await this.request<AdminStatsResponse>(endpoint, {
      cache: 'no-store',
    })

    const stats: AdminStatsOverview = {
      ...DEFAULT_ADMIN_STATS_OVERVIEW,
      ...(response?.stats ?? {}),
    }

    const analyticsSource = response?.analytics ?? DEFAULT_ADMIN_ANALYTICS_PAYLOAD
    const analytics: AdminAnalyticsPayload = {
      monthlyRevenue: Array.isArray(analyticsSource.monthlyRevenue)
        ? analyticsSource.monthlyRevenue.map((item) => ({ ...item }))
        : [],
      servicePerformance: Array.isArray(analyticsSource.servicePerformance)
        ? analyticsSource.servicePerformance.map((item) => ({ ...item }))
        : [],
      customerTierDistribution: Array.isArray(analyticsSource.customerTierDistribution)
        ? analyticsSource.customerTierDistribution.map((item) => ({ ...item }))
        : [],
      timeSlotDistribution: Array.isArray(analyticsSource.timeSlotDistribution)
        ? analyticsSource.timeSlotDistribution.map((item) => ({ ...item }))
        : [],
    }

    const performanceMetrics = Array.isArray(response?.performanceMetrics)
      ? response.performanceMetrics
      : []

    const recommendations = Array.isArray(response?.recommendations)
      ? response.recommendations
      : []

    const indexStatus: AdminPerformanceIndexStatus = response?.indexStatus
      ? {
          existing: [...(response.indexStatus.existing ?? [])],
          recommended: [...(response.indexStatus.recommended ?? [])],
        }
      : {
          existing: [],
          recommended: [],
        }

    const summary: AdminPerformanceSummary = {
      ...DEFAULT_ADMIN_PERFORMANCE_SUMMARY,
      ...(response?.summary ?? {}),
    }

    const warning = typeof response?.warning === 'string' ? response.warning : null
    const fallback = Boolean(response?.fallback)
    const awaitingReservations = typeof response?.awaitingReservations === 'number'
      ? response.awaitingReservations
      : undefined

    return {
      stats,
      analytics,
      performanceMetrics,
      recommendations,
      indexStatus,
      summary,
      warning,
      fallback,
      awaitingReservations,
    }
  }

  async getAdminSettings() {
    const response = await this.request<{
      success: boolean
      settings?: ReservationSettings
      warning?: string
      fallback?: boolean
      message?: string
    }>('/admin/settings', {
      cache: 'no-store',
    })

    if (!response?.success || !response.settings) {
      throw new Error(response?.message ?? '予約設定の取得に失敗しました')
    }

    return {
      settings: response.settings,
      warning: response.warning ?? null,
      fallback: Boolean(response.fallback),
    }
  }

  async updateAdminSettings(settings: ReservationSettings) {
    return this.request<{ success: boolean; settings: ReservationSettings; message?: string }>(
      '/admin/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      },
    )
  }

  async getAdminAnnouncements() {
    const response = await this.request<{
      success: boolean
      announcements?: Announcement[]
      warning?: string
      fallback?: boolean
      message?: string
    }>('/admin/announcements', {
      cache: 'no-store',
    })

    if (!response?.success || !Array.isArray(response.announcements)) {
      throw new Error(response?.message ?? 'お知らせの取得に失敗しました')
    }

    return {
      announcements: response.announcements.map((item) => ({ ...item })),
      warning: response.warning ?? null,
      fallback: Boolean(response.fallback),
    }
  }

  async createAdminAnnouncement(payload: Partial<Announcement>) {
    return this.request<{ success: boolean; announcement?: Announcement; message?: string }>(
      '/admin/announcements',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  }

  async updateAdminAnnouncement(id: string, payload: Partial<Announcement>) {
    const params = new URLSearchParams({ id })
    return this.request<{ success: boolean; announcement?: Announcement; message?: string }>(
      `/admin/announcements?${params.toString()}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
  }

  async deleteAdminAnnouncement(id: string) {
    const params = new URLSearchParams({ id })
    return this.request<{ success: boolean; message?: string }>(
      `/admin/announcements?${params.toString()}`,
      {
        method: 'DELETE',
      },
    )
  }

  async getAdminReservations(params?: {
    limit?: number
    cursor?: string
    status?: Reservation['status']
    customerId?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) {
      searchParams.set('limit', String(params.limit))
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor)
    }
    if (params?.status) {
      searchParams.set('status', params.status)
    }
    if (params?.customerId) {
      searchParams.set('customerId', params.customerId)
    }

    const query = searchParams.toString()

    return this.request<{
      success: boolean
      reservations: AdminReservationRecord[]
      cursor?: string | null
      hasNext?: boolean
      filters?: {
        status: string | null
        customerId: string | null
      }
    }>(`/admin/reservations${query ? `?${query}` : ''}`,
      {
        cache: 'no-store',
      },
    )
  }

  async updateAdminReservation(id: string, updates: Record<string, unknown>) {
    const params = new URLSearchParams({ id })
    return this.request<{ success: boolean; message?: string }>(`/admin/reservations?${params}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async createAdminReservation(payload: AdminCreateReservationPayload) {
    const response = await this.request<{
      success: boolean
      reservation?: AdminReservationRecord
      error?: string
      details?: string
    }>('/admin/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!response.success || !response.reservation) {
      const message = response.error ?? response.details ?? '予約の作成に失敗しました'
      throw new Error(message)
    }

    return {
      success: true,
      reservation: response.reservation,
    }
  }

  async processAdminReservations() {
    return this.request<AdminReservationProcessResult>('/admin/reservations/process', {
      method: 'POST',
    })
  }

  async getAdminCustomers(params?: {
    limit?: number
    cursor?: string
    q?: string
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
    createdAfter?: string
    createdBefore?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) {
      searchParams.set('limit', String(params.limit))
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor)
    }
    if (params?.q) {
      searchParams.set('q', params.q)
    }
    if (params?.tier) {
      searchParams.set('tier', params.tier)
    }
    if (params?.createdAfter) {
      searchParams.set('createdAfter', params.createdAfter)
    }
    if (params?.createdBefore) {
      searchParams.set('createdBefore', params.createdBefore)
    }

    const query = searchParams.toString()
    const response = await this.request<{
      success: boolean
      customers: AdminCustomerRecord[]
      cursor?: string | null
      hasNext?: boolean
      appliedFilters?: Record<string, string>
    }>(`/admin/customers${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    })

    const customers = Array.isArray(response.customers)
      ? response.customers
          .map((record) => normalizeCustomerRecord(record))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      : []

    return {
      success: response.success,
      customers,
      cursor: response.cursor ?? null,
      hasNext: Boolean(response.hasNext),
      appliedFilters: response.appliedFilters ?? {},
    }
  }

  async updateAdminCustomer(id: string, updates: Record<string, unknown>) {
    if (!id) {
      throw new Error('顧客IDが必要です')
    }

    const params = new URLSearchParams({ id })
    return this.request<{ success?: boolean; message?: string }>(
      `/admin/customers?${params.toString()}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    )
  }

  async createAdminCustomer(payload: AdminCreateCustomerPayload) {
    if (!payload?.name || payload.name.trim().length === 0) {
      throw new Error('顧客名は必須です')
    }

    const response = await this.request<{
      success: boolean
      customer?: AdminCustomerRecord
      error?: string
      details?: string
    }>('/admin/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!response.success || !response.customer) {
      const message = response.error ?? response.details ?? '顧客の作成に失敗しました'
      throw new Error(message)
    }

    return normalizeCustomerRecord(response.customer)
  }

  async deleteAdminCustomer(id: string) {
    if (!id) {
      throw new Error('顧客IDが必要です')
    }

    return this.request<{ success: boolean; message?: string }>(
      `/admin/customers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    )
  }

  // 予約関連
  async getReservations() {
    return this.request<{ reservations?: Reservation[] } | Reservation[]>('/reservations')
  }

  async getReservation(id: string) {
    return this.request<Reservation>(`/reservations/${id}`)
  }

  async createReservation(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(
      '/reservations',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    )
  }

  async updateReservation(id: string, action: 'confirm' | 'complete' | 'cancel', reason?: string) {
    return this.request<Record<string, unknown>>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    })
  }

  async cancelReservation(id: string, reason?: string) {
    return this.request<Record<string, unknown>>(`/reservations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    })
  }

  async getTimeSlots(date: string) {
    return this.request<Record<string, unknown>[]>(`/reservations/slots?date=${date}`, {}, false)
  }

  // 顧客関連（ユーザー向け）
  async getCustomers() {
    return this.request<Customer[]>('/customers')
  }

  async getCustomer(id: string) {
    return this.request<Customer>(`/customers/${id}`)
  }

  async updateCustomer(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 問い合わせ関連
  async getInquiries() {
    return this.request<Record<string, unknown>[]>('/inquiries')
  }

  async getInquiry(id: string) {
    return this.request<Record<string, unknown>>(`/inquiries/${id}`)
  }

  async createInquiry(data: {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
  }) {
    return this.request<Record<string, unknown>>(
      '/inquiries',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    )
  }

  async updateInquiry(id: string, data: { status?: string; reply?: string }) {
    return this.request<Record<string, unknown>>(`/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<Record<string, unknown>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  async deleteAccount(password: string) {
    return this.request<Record<string, unknown>>('/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    })
  }

  // サービスプラン関連（公開・管理）
  async getPublishedServicePlans() {
    const response = await this.request<{ success: boolean; plans?: ServicePlan[] }>(
      '/service-plans',
      {},
      false,
    )

    if (!response.success || !Array.isArray(response.plans)) {
      return [] as ServicePlan[]
    }

    return response.plans
  }

  async getAdminServicePlans() {
    const response = await this.request<{ success: boolean; plans: AdminServicePlanRecord[] }>(
      '/admin/service-plans',
      { cache: 'no-store' },
    )

    return {
      success: response.success,
      plans: Array.isArray(response.plans)
        ? response.plans.map((plan) => normalizeServicePlanRecord(plan))
        : [],
    }
  }

  async createAdminServicePlan(data: Record<string, unknown>) {
    return this.request<{ success: boolean; id: string }>('/admin/service-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAdminServicePlan(id: string, data: Record<string, unknown>) {
    return this.request<{ success: boolean }>(`/admin/service-plans?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAdminServicePlan(id: string) {
    return this.request<{ success: boolean }>(`/admin/service-plans?id=${id}`, {
      method: 'DELETE',
    })
  }

  async getAdminInquiries() {
    const response = await this.request<{
      success: boolean
      inquiries?: AdminInquiryRecord[]
    }>(
      '/admin/inquiries',
      { cache: 'no-store' },
    )

    return {
      success: response.success,
      inquiries: Array.isArray(response.inquiries)
        ? response.inquiries.map((record) => normalizeAdminInquiryRecord(record))
        : [],
    }
  }

  async updateAdminInquiry(id: string, data: Record<string, unknown>) {
    return this.request<{ success: boolean }>(`/admin/inquiries?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // LINE公式アカウント（管理）
  async getAdminLineConversations(options: { limit?: number; cursor?: string } = {}) {
    const params = new URLSearchParams()
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit))
    }
    if (typeof options.cursor === 'string' && options.cursor.trim().length > 0) {
      params.set('cursor', options.cursor.trim())
    }

    const endpoint = params.toString()
      ? `/admin/line/conversations?${params.toString()}`
      : '/admin/line/conversations'

    return this.request<{
      success: boolean
      conversations?: LineConversation[]
      nextCursor?: string | null
      error?: string
    }>(endpoint, { cache: 'no-store' })
  }

  async getAdminLineConversation(userId: string, options: { limit?: number; cursor?: string } = {}) {
    const encoded = encodeURIComponent(userId)
    const params = new URLSearchParams()
    if (typeof options.limit === 'number') {
      params.set('limit', String(options.limit))
    }
    if (typeof options.cursor === 'string' && options.cursor.trim().length > 0) {
      params.set('cursor', options.cursor.trim())
    }

    const endpoint = params.toString()
      ? `/admin/line/conversations/${encoded}?${params.toString()}`
      : `/admin/line/conversations/${encoded}`

    return this.request<{
      success: boolean
      conversation?: LineConversation
      messages?: LineMessage[]
      nextCursor?: string | null
      error?: string
    }>(endpoint, { cache: 'no-store' })
  }

  async markAdminLineConversationRead(userId: string) {
    const encoded = encodeURIComponent(userId)
    return this.request<{ success: boolean }>(`/admin/line/conversations/${encoded}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'markRead' }),
    })
  }

  async linkAdminLineConversationCustomer(lineUserId: string, customerId: string) {
    const encoded = encodeURIComponent(lineUserId)
    return this.request<{ success: boolean }>(`/admin/line/conversations/${encoded}`, {
      method: 'PATCH',
      body: JSON.stringify({ customerId }),
    })
  }

  async unlinkAdminLineConversationCustomer(lineUserId: string) {
    const encoded = encodeURIComponent(lineUserId)
    return this.request<{ success: boolean }>(`/admin/line/conversations/${encoded}`, {
      method: 'PATCH',
      body: JSON.stringify({ customerId: null }),
    })
  }

  async sendAdminLineMessage(userId: string, text: string) {
    return this.request<{ success: boolean }>(`/admin/line/send`, {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    })
  }
}

export const apiClient = new ApiClient()
