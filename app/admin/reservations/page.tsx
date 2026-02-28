'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import ReservationCalendar from '@/components/admin/ReservationCalendar'
import ReservationCreateModal from '@/components/admin/ReservationCreateModal'
import ReservationEditModal from '@/components/admin/ReservationEditModal'
import IntakeSummary from '@/components/reservation/IntakeSummary'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { normalizeIntakeForm } from '@/lib/utils/intakeFormDefaults'
import { exportReservationsToICal } from '@/lib/utils/reservations/exportToICal'

import type {
  AdminCreateReservationPayload,
  AdminReservationRecord,
  AdminStatsOverview,
} from '@/lib/api/client'
import type { Customer, Reservation, ServicePlan } from '@/lib/types'
import type { SlotInfo } from 'react-big-calendar'

const parseDate = (value?: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (value && typeof value === 'object' && 'toDate' in (value as { toDate?: () => Date })) {
    try {
      const parsed = (value as { toDate: () => Date }).toDate()
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    } catch {
      /* ignore */
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return new Date()
}

const normalizeReservationRecord = (record: AdminReservationRecord): Reservation => ({
  id: record.id,
  customerId: record.customerId ?? null,
  customerName: record.customerName ?? '',
  customerEmail: record.customerEmail ?? '',
  customerPhone: record.customerPhone ?? '',
  serviceType: record.serviceType,
  serviceName: record.serviceName,
  price: record.price,
  maintenanceOptions: record.maintenanceOptions,
  maintenancePrice: record.maintenancePrice,
  totalPrice: record.totalPrice,
  date: record.date,
  time: record.time,
  status: record.status,
  notes: record.notes,
  createdAt: parseDate(record.createdAt),
  updatedAt: parseDate(record.updatedAt),
  createdBy: record.createdBy,
  completedAt: record.completedAt ? parseDate(record.completedAt) : undefined,
  cancelReason: record.cancelReason,
  cancelledAt: record.cancelledAt ? parseDate(record.cancelledAt) : undefined,
  isMonitor: record.isMonitor,
  finalPrice: record.finalPrice,
  pointsUsed: record.pointsUsed,
  intakeForm: record.intakeForm ? normalizeIntakeForm(record.intakeForm) : undefined,
})

const DEFAULT_CANCEL_REASON =
  'サロン都合によりご予約をキャンセルさせていただきます。ご迷惑をおかけし申し訳ございません。'

export default function AdminReservations() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>(
    'all',
  )
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showStatusAlert, setShowStatusAlert] = useState(false)
  const [statusAlertMessage, setStatusAlertMessage] = useState('')
  const [isFallbackData, setIsFallbackData] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createDefaults, setCreateDefaults] = useState<{ date?: string; time?: string }>({})
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([])
  const [customerCursor, setCustomerCursor] = useState<string | null>(null)
  const [customerHasNext, setCustomerHasNext] = useState(false)
  const [servicePlanOptions, setServicePlanOptions] = useState<ServicePlan[]>([])
  const [createOptionsLoaded, setCreateOptionsLoaded] = useState(false)
  const [loadingCreateOptions, setLoadingCreateOptions] = useState(false)
  const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false)
  const [refreshingServices, setRefreshingServices] = useState(false)
  const [statsOverview, setStatsOverview] = useState<AdminStatsOverview | null>(null)
  const [statsWarning, setStatsWarning] = useState<string | null>(null)
  const [businessHours, setBusinessHours] = useState<{ dayOfWeek: number; isOpen: boolean; maxCapacityPerDay?: number }[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])

  const RESERVATION_PAGE_SIZE = 20

  const loadReservations = useCallback(
    async (
      options: {
        cursor?: string | null
        append?: boolean
        silent?: boolean
      } = {},
    ): Promise<Reservation[]> => {
      if (options.append) {
        setLoadingMore(true)
      } else {
        setRefreshing(true)
        setNextCursor(null)
        setHasNextPage(false)
      }

      try {
        setIsFallbackData(false)
        setErrorMessage(null)

        const response = await apiClient.getAdminReservations({
          limit: RESERVATION_PAGE_SIZE,
          cursor: options.cursor ?? undefined,
          status: filter === 'all' ? undefined : filter,
        })

        if (!response.success || !Array.isArray(response.reservations)) {
          throw new Error('Invalid response format')
        }

        const normalizedReservations = response.reservations.map((record) =>
          normalizeReservationRecord(record),
        )

        let nextState: Reservation[] = []
        setReservations((prev) => {
          const base = options.append ? prev : []
          const merged = [...base, ...normalizedReservations]
          const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
          deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          nextState = deduped
          return deduped
        })

        setNextCursor(response.cursor ?? null)
        setHasNextPage(Boolean(response.hasNext) && Boolean(response.cursor))

        try {
          storageService.replaceReservations(nextState)
        } catch (storageError) {
          console.warn('Failed to persist reservations to storage', storageError)
        }

        return nextState
      } catch (error: unknown) {
        console.error('Failed to load reservations:', error)

        // 権限エラーの場合は明示的に表示
        const errorMsg = error instanceof Error ? error.message : String(error)
        const isPermissionError = errorMsg.includes('権限エラー') || errorMsg.includes('permission')

        const fallbackReservations = storageService
          .getAllReservations()
          .map((record) => normalizeReservationRecord(record as unknown as AdminReservationRecord))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        let fallbackResult: Reservation[] = []
        setReservations((prev) => {
          const base = options.append ? prev : []
          const merged = [...base, ...fallbackReservations]
          const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
          deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          fallbackResult = deduped
          return deduped
        })
        setIsFallbackData(true)

        if (isPermissionError) {
          setErrorMessage('⚠️ 権限エラー: Firestoreから予約情報を取得できません。Firebaseのセキュリティルールを確認してください。ローカルの参考データを表示しています。')
        } else {
          setErrorMessage('Firestoreから予約データを取得できなかったため、ローカルの参考データを表示しています。')
        }

        setSelectedReservation(null)
        setEditingReservation(null)
        setNextCursor(null)
        setHasNextPage(false)
        return fallbackResult
      } finally {
        if (options.append) {
          setLoadingMore(false)
        } else {
          setRefreshing(false)
        }
      }
    },
    [filter],
  )

  const ensureCreateOptions = useCallback(
    async (force = false) => {
      if ((createOptionsLoaded && !force) || loadingCreateOptions) {
        return
      }

      setLoadingCreateOptions(true)
      try {
        const [customersResult, servicePlansResult] = await Promise.all([
          apiClient.getAdminCustomers({ limit: 100 }),
          apiClient.getAdminServicePlans(),
        ])

        setCustomerOptions(customersResult.customers)
        setCustomerCursor(customersResult.cursor ?? null)
        setCustomerHasNext(Boolean(customersResult.hasNext) && Boolean(customersResult.cursor))
        setServicePlanOptions(servicePlansResult.plans)
        setCreateOptionsLoaded(true)
      } catch (error) {
        console.error('予約作成用のデータ取得に失敗しました:', error)
        setErrorMessage((prev) =>
          prev ?? '予約作成に必要なデータの取得に失敗しました。再読込後にお試しください。',
        )
      } finally {
        setLoadingCreateOptions(false)
      }
    },
    [createOptionsLoaded, loadingCreateOptions],
  )

  const loadMoreCustomerOptions = useCallback(async () => {
    if (!customerHasNext || !customerCursor || loadingMoreCustomers) {
      return
    }
    setLoadingMoreCustomers(true)
    try {
      const result = await apiClient.getAdminCustomers({
        limit: 100,
        cursor: customerCursor,
      })
      setCustomerOptions((prev) => {
        const merged = [...prev, ...result.customers]
        const deduped = Array.from(new Map(merged.map((customer) => [customer.id, customer])).values())
        return deduped
      })
      setCustomerCursor(result.cursor ?? null)
      setCustomerHasNext(Boolean(result.hasNext) && Boolean(result.cursor))
    } catch (error) {
      console.error('顧客リストの追加読み込みに失敗しました:', error)
      alert(error instanceof Error ? error.message : '顧客リストの追加読み込みに失敗しました')
    } finally {
      setLoadingMoreCustomers(false)
    }
  }, [customerCursor, customerHasNext, loadingMoreCustomers])

  const refreshServicePlans = useCallback(async () => {
    setRefreshingServices(true)
    try {
      const result = await apiClient.getAdminServicePlans()
      setServicePlanOptions(result.plans)
    } catch (error) {
      console.error('サービスプランの再取得に失敗しました:', error)
      alert(error instanceof Error ? error.message : 'サービスプランの再取得に失敗しました')
    } finally {
      setRefreshingServices(false)
    }
  }, [])

  const reloadCustomerOptions = useCallback(async () => {
    await ensureCreateOptions(true)
  }, [ensureCreateOptions])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') {
      router.replace('/login')
      return
    }

    void loadReservations()
  }, [authLoading, user, router, loadReservations])

  useEffect(() => {
    if (authLoading || !user || user.role !== 'admin') {
      return
    }

    let mounted = true
    const fetchStats = async () => {
      try {
        const data = await apiClient.getAdminStats({ forceRefresh: true })
        if (!mounted || !data?.stats) {
          return
        }
        setStatsOverview(data.stats)
        setStatsWarning(data.warning ?? null)
      } catch (error) {
        console.warn('Failed to load admin stats for reservations page', error)
      }
    }

    fetchStats()

    return () => {
      mounted = false
    }
  }, [authLoading, user])

  // 予約設定（営業日・ブロック日）を取得
  useEffect(() => {
    if (authLoading || !user || user.role !== 'admin') return

    const fetchSettings = async () => {
      try {
        const response = await apiClient.getAdminSettings()
        if (response?.settings) {
          setBusinessHours(
            response.settings.businessHours?.map((h: any) => ({
              dayOfWeek: h.dayOfWeek,
              isOpen: Boolean(h.isOpen),
              maxCapacityPerDay: h.maxCapacityPerDay ?? 1,
            })) ?? [],
          )
          setBlockedDates(response.settings.blockedDates ?? [])
        }
      } catch (error) {
        console.warn('Failed to load reservation settings', error)
      }
    }

    fetchSettings()
  }, [authLoading, user])

  const requireLiveData = (actionLabel?: string) => {
    if (!isFallbackData) {
      return true
    }
    const message = actionLabel
      ? `${actionLabel}を行う前に Firestore との接続を復旧し、「再読込」を実行してください。`
      : 'Firestore との接続を復旧し、「再読込」を実行してください。'
    alert(message)
    return false
  }

  const openCreateModal = (defaults: { date?: string; time?: string } = {}) => {
    if (!requireLiveData('新規予約の作成')) {
      return
    }
    setCreateDefaults(defaults)
    setIsCreateModalOpen(true)
    void ensureCreateOptions()
  }

  const handleCreateReservation = async (payload: AdminCreateReservationPayload) => {
    try {
      const response = await apiClient.createAdminReservation(payload)
      const record = response.reservation
      let latestState: Reservation[] = []
      setReservations((prev) => {
        const merged = [normalizeReservationRecord(record), ...prev]
        const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
        deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        latestState = deduped
        return deduped
      })

      setIsFallbackData(false)

      try {
        storageService.replaceReservations(latestState)
      } catch (storageError) {
        console.warn('Failed to persist reservations after creation', storageError)
      }

      const refreshed = await loadReservations({ silent: true })
      if (refreshed.length > 0) {
        const createdReservation = refreshed.find((item) => item.id === record.id)
        if (createdReservation) {
          setSelectedReservation(createdReservation)
        }
      }

      setStatusAlertMessage('新しい予約を作成しました')
      setShowStatusAlert(true)
      setTimeout(() => setShowStatusAlert(false), 3000)
    } catch (error) {
      console.error('Failed to create reservation:', error)
      throw error instanceof Error ? error : new Error('予約の作成に失敗しました')
    }
  }

  const handleReload = () => {
    void loadReservations({ silent: true })
  }

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore || isFallbackData) {
      return
    }
    void loadReservations({ cursor: nextCursor, append: true })
  }

  const actionsDisabled = isFallbackData
  const totalReservations = useMemo(
    () => statsOverview?.totalReservations ?? reservations.length,
    [statsOverview, reservations.length],
  )
  const pendingTotal = statsOverview?.pendingReservations ?? null

  const handleStatusUpdate = async (
    reservationId: string,
    newStatus: Reservation['status'],
    options?: { reason?: string },
  ) => {
    if (!requireLiveData('ステータス更新')) {
      return
    }
    try {
      setIsProcessing(true)

      const effectiveReason = options?.reason?.trim() ?? ''

      const updates: Record<string, unknown> = {
        status: newStatus,
      }

      if (newStatus === 'completed') {
        updates.completedAt = new Date().toISOString()
        updates.cancelledAt = null
        updates.cancelReason = null
      } else if (newStatus === 'cancelled') {
        updates.cancelledAt = new Date().toISOString()
        updates.completedAt = null
        updates.cancelReason = effectiveReason
      } else {
        updates.completedAt = null
        updates.cancelledAt = null
        updates.cancelReason = null
      }

      await apiClient.updateAdminReservation(reservationId, updates)

      const now = new Date()
      setReservations((prev) =>
        prev.map((item) =>
          item.id === reservationId
            ? {
                ...item,
                status: newStatus,
                completedAt: newStatus === 'completed' ? now : undefined,
                cancelledAt: newStatus === 'cancelled' ? now : undefined,
                cancelReason: newStatus === 'cancelled' ? effectiveReason : undefined,
              }
            : item,
        ),
      )
      setSelectedReservation((prev) =>
        prev && prev.id === reservationId
          ? {
              ...prev,
              status: newStatus,
              completedAt: newStatus === 'completed' ? now : undefined,
              cancelledAt: newStatus === 'cancelled' ? now : undefined,
              cancelReason: newStatus === 'cancelled' ? effectiveReason : undefined,
            }
          : prev,
      )

      switch (newStatus) {
        case 'completed':
          setStatusAlertMessage('予約を完了に更新しました')
          break
        case 'confirmed':
          setStatusAlertMessage('予約を確認済みに更新しました')
          break
        case 'cancelled':
          setStatusAlertMessage('予約をキャンセルしました')
          break
        default:
          setStatusAlertMessage(`ステータスを${getStatusText(newStatus)}に更新しました`)
      }

      const refreshed = await loadReservations({ silent: true })
      const latestRecord = refreshed.find((item) => item.id === reservationId)
      if (latestRecord) {
        setSelectedReservation((prev) => (prev && prev.id === reservationId ? latestRecord : prev))
      }

      setShowStatusAlert(true)
      setTimeout(() => setShowStatusAlert(false), 3000)
    } catch (error: unknown) {
      console.error('Status update error:', error)
      const message = error instanceof Error ? error.message : 'ステータスの更新に失敗しました'
      alert(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelWithReason = async (reservation: Reservation) => {
    if (!requireLiveData('ステータス更新')) {
      return
    }

    const initialReason =
      reservation.cancelReason && reservation.cancelReason.trim().length > 0
        ? reservation.cancelReason
        : DEFAULT_CANCEL_REASON

    const input = window.prompt(
      'キャンセル理由を入力してください（お客様にもメールで通知されます）',
      initialReason,
    )

    if (input === null) {
      return
    }

    const trimmedReason = input.trim() || DEFAULT_CANCEL_REASON
    await handleStatusUpdate(reservation.id, 'cancelled', { reason: trimmedReason })
  }

  const handleBatchProcessCompletedReservations = async () => {
    if (!requireLiveData('完了予約のポイント付与')) {
      return
    }

    if (!confirm('完了すべき予約を自動処理し、ポイントを付与しますか？')) {
      return
    }

    try {
      setIsProcessing(true)
      const result = await apiClient.processAdminReservations()

      if (result.errors.length > 0) {
        console.error('予約処理中にエラーが発生しました', result.errors)
      }

      if (result.processedCount > 0) {
        await loadReservations({ silent: true })
      }

      const feedbackMessage =
        result.message ||
        (result.processedCount > 0
          ? `${result.processedCount}件の予約を完了し、合計${result.pointsTotal}ポイントを付与しました`
          : '処理対象の予約はありませんでした')

      setStatusAlertMessage(feedbackMessage)
      setShowStatusAlert(true)
      setTimeout(() => setShowStatusAlert(false), 5000)
    } catch (error: unknown) {
      console.error('Batch process error:', error)
      const message = error instanceof Error ? error.message : '一括処理に失敗しました'
      alert(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReservationUpdate = async (updatedReservation: Reservation) => {
    if (!requireLiveData('予約情報の更新')) {
      setEditingReservation(null)
      return
    }

    if (!editingReservation) {
      throw new Error('編集対象の予約が見つかりません')
    }

    const original = editingReservation
    const updates: Record<string, unknown> = {}

    if (updatedReservation.customerName !== original.customerName) {
      updates.customerName = updatedReservation.customerName
    }
    if (updatedReservation.customerEmail !== original.customerEmail) {
      updates.customerEmail = updatedReservation.customerEmail
    }
    if (updatedReservation.customerPhone !== original.customerPhone) {
      updates.customerPhone = updatedReservation.customerPhone
    }
    if (updatedReservation.date !== original.date) {
      updates.date = updatedReservation.date
    }
    if (updatedReservation.time !== original.time) {
      updates.time = updatedReservation.time
    }
    if (updatedReservation.serviceType !== original.serviceType) {
      updates.serviceType = updatedReservation.serviceType
    }
    if (updatedReservation.serviceName !== original.serviceName) {
      updates.serviceName = updatedReservation.serviceName
    }
    if (updatedReservation.price !== original.price) {
      updates.price = updatedReservation.price
    }
    if ((updatedReservation.notes || '') !== (original.notes || '')) {
      updates.notes = updatedReservation.notes ?? ''
    }

    const statusChanged = updatedReservation.status !== original.status
    if (statusChanged) {
      updates.status = updatedReservation.status
      if (updatedReservation.status === 'completed') {
        updates.completedAt = new Date().toISOString()
        updates.cancelledAt = null
      } else if (updatedReservation.status === 'cancelled') {
        updates.cancelledAt = new Date().toISOString()
        updates.completedAt = null
      } else {
        updates.completedAt = null
        updates.cancelledAt = null
      }
    }

    if (Object.keys(updates).length === 0) {
      setStatusAlertMessage('変更された内容はありません')
      setShowStatusAlert(true)
      setTimeout(() => setShowStatusAlert(false), 3000)
      setEditingReservation(null)
      return
    }

    setIsProcessing(true)
    try {
      await apiClient.updateAdminReservation(updatedReservation.id, updates)
      const refreshed = await loadReservations({ silent: true })
      const latestRecord = refreshed.find((item) => item.id === updatedReservation.id)
      if (latestRecord) {
        setSelectedReservation((prev) => (prev && prev.id === latestRecord.id ? latestRecord : prev))
      }
      setStatusAlertMessage('予約情報を更新しました')
      setShowStatusAlert(true)
      setTimeout(() => setShowStatusAlert(false), 3000)
      setEditingReservation(null)
    } catch (error: unknown) {
      console.error('Reservation update error:', error)
      throw error instanceof Error ? error : new Error('予約の更新に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenEdit = (reservation: Reservation) => {
    if (!requireLiveData('予約の編集')) {
      return
    }
    setEditingReservation(reservation)
  }

  const handleCallCustomer = (phone: string) => {
    if (!requireLiveData('電話発信')) {
      return
    }
    window.location.href = `tel:${phone}`
  }

  const handleCalendarDateClick = (selectedDate: Date) => {
    const start = selectedDate instanceof Date ? selectedDate : new Date(selectedDate ?? Date.now())
    if (Number.isNaN(start.getTime())) {
      openCreateModal()
      return
    }
    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate(),
    ).padStart(2, '0')}`
    const hours = start.getHours().toString().padStart(2, '0')
    const minutes = start.getMinutes().toString().padStart(2, '0')
    openCreateModal({ date: dateStr, time: `${hours}:${minutes}` })
  }

  const handleExportICal = () => {
    const icalContent = exportReservationsToICal(reservations)
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `beeartena_reservations_${new Date().toISOString().split('T')[0]}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredReservations =
    filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'confirmed':
        return 'text-blue-600 bg-blue-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: Reservation['status']) => {
    switch (status) {
      case 'pending':
        return '承認待ち'
      case 'confirmed':
        return '確定'
      case 'completed':
        return '完了'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

  if (authLoading || refreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        予約データを読み込み中です…
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">予約管理</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openCreateModal()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={actionsDisabled}
              >
                ➕ 新規予約
              </button>
              <button
                onClick={handleReload}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={refreshing}
              >
                {refreshing ? '再読込中…' : '再読込'}
              </button>
              <button
                onClick={handleBatchProcessCompletedReservations}
                disabled={actionsDisabled || isProcessing}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '処理中...' : '🎁 完了予約のポイント付与'}
              </button>
              <button
                onClick={handleExportICal}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                📅 カレンダーエクスポート
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="text-primary hover:text-dark-gold"
              >
                ← 管理画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Alert */}
        {showStatusAlert && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {statusAlertMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        {statsWarning && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {statsWarning}
          </div>
        )}

        {statsOverview && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">総予約数</p>
                <p className="text-2xl font-semibold">{statsOverview.totalReservations}</p>
                <p className="text-xs text-gray-500 mt-1">表示中: {reservations.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">承認待ち</p>
                <p className="text-2xl font-semibold">{statsOverview.pendingReservations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">本日の予約</p>
                <p className="text-2xl font-semibold">{statsOverview.todayReservations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">今月の売上（概算）</p>
                <p className="text-2xl font-semibold">
                  ¥{statsOverview.monthlyRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📅 カレンダー表示
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 リスト表示
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="flex gap-2">
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(
                  (status) => {
                    const displayedCount =
                      status === 'all'
                        ? reservations.length
                        : reservations.filter((r) => r.status === status).length

                    const totalAnnotation =
                      status === 'all'
                        ? ` / 総数 ${totalReservations}`
                        : status === 'pending' && pendingTotal !== null
                          ? ` / 総数 ${pendingTotal}`
                          : ''

                    return (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-3 py-1 rounded-lg font-medium text-sm transition-colors ${
                          filter === status
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' ? '全て' : getStatusText(status)}
                        <span className="ml-1 text-xs text-gray-600">
                          （表示中 {displayedCount}
                          {totalAnnotation}）
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ReservationCalendar
              reservations={reservations}
              onEventClick={(reservation) => setSelectedReservation(reservation)}
              onDateClick={handleCalendarDateClick}
              blockedDates={blockedDates}
              businessHours={businessHours}
            />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredReservations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">該当する予約がありません</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => (
                <div key={reservation.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">予約ID</p>
                      <p className="font-semibold">{reservation.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">お客様</p>
                      <p className="font-semibold">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">サービス</p>
                      <p className="font-semibold">{reservation.serviceName}</p>
                      <p className="text-sm text-gray-500">¥{reservation.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">日時</p>
                      <p className="font-semibold">
                        {new Date(reservation.date).toLocaleDateString('ja-JP')} {reservation.time}
                      </p>
                    </div>
                  </div>

                  {reservation.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">備考</p>
                      <p className="text-sm">{reservation.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}
                    >
                      {getStatusText(reservation.status)}
                    </span>

                    <div className="flex gap-2">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'confirmed')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={actionsDisabled || isProcessing}
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleCancelWithReason(reservation)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={actionsDisabled || isProcessing}
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'completed')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={actionsDisabled || isProcessing}
                          >
                            完了
                          </button>
                          <button
                            onClick={() => handleCancelWithReason(reservation)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={actionsDisabled || isProcessing}
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                      {reservation.status === 'completed' && (
                        <button
                          onClick={() => handleCancelWithReason(reservation)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={actionsDisabled || isProcessing}
                        >
                          管理者キャンセル
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(reservation)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={actionsDisabled}
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => handleCallCustomer(reservation.customerPhone)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={actionsDisabled}
                        type="button"
                      >
                        📞 電話
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {hasNextPage && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore || isFallbackData}
                  className="mt-4 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingMore ? '読み込み中…' : 'さらに読み込む'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reservation Detail Modal */}
        {selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <h3 className="text-xl font-bold mb-4">予約詳細</h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">お客様</p>
                    <p className="font-semibold">{selectedReservation.customerName}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">サービス</p>
                    <p className="font-semibold">{selectedReservation.serviceName}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">日時</p>
                    <p className="font-semibold">
                      {new Date(selectedReservation.date).toLocaleDateString('ja-JP')}{' '}
                      {selectedReservation.time}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">ステータス</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReservation.status)}`}
                    >
                      {getStatusText(selectedReservation.status)}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">連絡先</p>
                    <p>{selectedReservation.customerEmail}</p>
                    <p>{selectedReservation.customerPhone}</p>
                  </div>

                  {selectedReservation.intakeForm && (
                    <div>
                      <p className="text-sm text-gray-600">施術前問診</p>
                      <IntakeSummary
                        intakeForm={selectedReservation.intakeForm}
                        className="bg-gray-50 border-gray-200 mt-2"
                      />
                    </div>
                  )}

                  {selectedReservation.notes && (
                    <div>
                      <p className="text-sm text-gray-600">備考</p>
                      <p>{selectedReservation.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-2 pt-4 border-t">
                {selectedReservation.status === 'pending' && (
                  <>
                    <button
                      onClick={async () => {
                        if (!requireLiveData('ステータス更新')) {
                          return
                        }
                        await handleStatusUpdate(selectedReservation.id, 'confirmed')
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={actionsDisabled || isProcessing}
                    >
                      承認
                    </button>
                    <button
                      onClick={async () => {
                        await handleCancelWithReason(selectedReservation)
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={actionsDisabled || isProcessing}
                    >
                      キャンセル
                    </button>
                  </>
                )}
                {selectedReservation.status === 'confirmed' && (
                  <>
                    <button
                      onClick={async () => {
                        if (!requireLiveData('ステータス更新')) {
                          return
                        }
                        await handleStatusUpdate(selectedReservation.id, 'completed')
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={actionsDisabled || isProcessing}
                    >
                      完了
                    </button>
                    <button
                      onClick={async () => {
                        await handleCancelWithReason(selectedReservation)
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={actionsDisabled || isProcessing}
                    >
                      キャンセル
                    </button>
                  </>
                )}
                {selectedReservation.status === 'completed' && (
                  <button
                    onClick={async () => {
                      await handleCancelWithReason(selectedReservation)
                      setSelectedReservation(null)
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={actionsDisabled || isProcessing}
                  >
                    管理者キャンセル
                  </button>
                )}
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReservation && (
          <ReservationEditModal
            reservation={editingReservation}
            onClose={() => setEditingReservation(null)}
            onUpdate={handleReservationUpdate}
          />
        )}
        <ReservationCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateReservation}
          customers={customerOptions}
          services={servicePlanOptions}
          defaultDate={createDefaults.date}
          defaultTime={createDefaults.time}
          loadingOptions={loadingCreateOptions}
          loadingMoreCustomers={loadingMoreCustomers}
          hasMoreCustomers={customerHasNext}
          onLoadMoreCustomers={loadMoreCustomerOptions}
          onReloadCustomers={reloadCustomerOptions}
          onRefreshServices={refreshServicePlans}
          refreshingServices={refreshingServices}
        />
      </div>
    </div>
  )
}
