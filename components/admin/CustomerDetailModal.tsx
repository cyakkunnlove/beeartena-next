"use client"

import { useEffect, useMemo, useState } from 'react'

import { apiClient } from '@/lib/api/client'
import { storageService } from '@/lib/storage/storageService'
import { getErrorMessage } from '@/lib/types'

import type {
  AdminReservationRecord,
} from '@/lib/api/client'
import type { Customer, Reservation } from '@/lib/types'

interface CustomerDetailModalProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  disableLiveRequests?: boolean
}

const parseDate = (value: unknown): Date => {
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

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as { seconds?: number }) &&
    typeof (value as { seconds?: number }).seconds === 'number'
  ) {
    const seconds = (value as { seconds: number }).seconds
    const nanoseconds = Number((value as { nanoseconds?: number }).nanoseconds ?? 0)
    const parsed = new Date(seconds * 1000 + Math.trunc(nanoseconds / 1_000_000))
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return new Date()
}

const normalizeReservation = (
  record: AdminReservationRecord | (Reservation & { createdAt?: unknown; updatedAt?: unknown }),
): Reservation => {
  const createdAt = parseDate(record.createdAt)
  const updatedAt = parseDate(record.updatedAt ?? record.createdAt)
  const completedAt = record.completedAt ? parseDate(record.completedAt) : undefined
  const cancelledAt = record.cancelledAt ? parseDate(record.cancelledAt) : undefined

  return {
    id: record.id,
    customerId: record.customerId ?? null,
    customerName: record.customerName ?? '',
    customerEmail: record.customerEmail ?? '',
    customerPhone: record.customerPhone ?? '',
    serviceType: record.serviceType ?? '',
    serviceName: record.serviceName ?? '',
    price: record.price ?? 0,
    maintenanceOptions: record.maintenanceOptions,
    maintenancePrice: record.maintenancePrice,
    totalPrice: record.totalPrice,
    date: record.date,
    time: record.time,
    status: record.status ?? 'pending',
    notes: record.notes,
    createdAt,
    updatedAt,
    createdBy: record.createdBy,
    completedAt,
    cancelReason: record.cancelReason,
    cancelledAt,
    isMonitor: record.isMonitor,
    finalPrice: record.finalPrice,
    intakeForm: record.intakeForm,
  }
}

const formatDate = (value: Date | string | undefined) => {
  if (!value) {
    return '-'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '¥0'
  }
  return `¥${value.toLocaleString('ja-JP')}`
}

export default function CustomerDetailModal({
  open,
  customer,
  onClose,
  disableLiveRequests = false,
}: CustomerDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    if (!open || !customer) {
      return
    }

    let canceled = false

    const loadDetail = async () => {
      setLoading(true)
      setErrorMessage(null)
      setUsedFallback(false)

      const results = {
        reservations: [] as Reservation[],
        fallback: false,
      }

      const fetchReservations = async () => {
        let liveRequestFailed = false
        if (!disableLiveRequests) {
          try {
            const aggregated: Reservation[] = []
            let cursor: string | null = null
            const MAX_PAGES = 5

            for (let page = 0; page < MAX_PAGES; page++) {
              const response = await apiClient.getAdminReservations({
                customerId: customer.id,
                limit: 25,
                cursor: cursor ?? undefined,
              })

              if (!response || !Array.isArray(response.reservations)) {
                break
              }

              aggregated.push(
                ...response.reservations.map((record) => normalizeReservation(record)),
              )

              if (!response.hasNext || !response.cursor) {
                break
              }

              cursor = response.cursor
            }

            const deduped = Array.from(new Map(aggregated.map((item) => [item.id, item])).values())

            return deduped
          } catch (error) {
            console.warn('Failed to load reservations from API, falling back to local storage', error)
            liveRequestFailed = true
          }
        }

        const fallbackReservations = storageService
          .getReservations(customer.id)
          .map((record) => normalizeReservation(record as Reservation))

        if (disableLiveRequests || liveRequestFailed) {
          results.fallback = true
        }

        return fallbackReservations
      }

      try {
        const reservationResults = await fetchReservations()

        results.reservations = reservationResults.sort(
          (a, b) =>
            new Date(`${b.date}T${b.time ?? '00:00'}`).getTime() -
            new Date(`${a.date}T${a.time ?? '00:00'}`).getTime(),
        )
      } catch (error) {
        results.fallback = true
        setErrorMessage(getErrorMessage(error))
      }

      if (!canceled) {
        setReservations(results.reservations)
        setUsedFallback(results.fallback)
        setLoading(false)
      }
    }

    void loadDetail()

    return () => {
      canceled = true
      setReservations([])
    }
  }, [open, customer, disableLiveRequests])

  const summary = useMemo(() => {
    const total = reservations.length
    const pending = reservations.filter((reservation) => reservation.status === 'pending').length
    const confirmed = reservations.filter((reservation) => reservation.status === 'confirmed').length
    const completed = reservations.filter((reservation) => reservation.status === 'completed').length
    const cancelled = reservations.filter((reservation) => reservation.status === 'cancelled').length
    const upcoming = reservations.filter((reservation) => {
      if (!reservation.date) {
        return false
      }
      const timeString = reservation.time ?? '00:00'
      const dateTime = new Date(`${reservation.date}T${timeString.padStart(5, '0')}`)
      return dateTime.getTime() >= Date.now() && reservation.status !== 'cancelled'
    }).length

    const lastReservation = reservations[0]

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      upcoming,
      lastReservation,
    }
  }, [reservations])

  if (!open || !customer) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">顧客詳細</h2>
            <p className="text-sm text-gray-500">{customer.name}（ID: {customer.id}）</p>
          </div>
          <div className="flex items-center gap-3">
            {usedFallback && (
              <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-md">
                オフラインデータを表示中
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-sm text-gray-600">詳細情報を読み込んでいます…</p>
          </div>
        ) : (
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">基本情報</h3>
                <dl className="grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2 md:gap-y-3">
                  <div>
                    <dt className="text-gray-500">氏名</dt>
                    <dd className="font-medium text-gray-900">{customer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">メールアドレス</dt>
                    <dd className="font-medium text-gray-900">{customer.email}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">電話番号</dt>
                    <dd className="font-medium text-gray-900">{customer.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">会員ランク</dt>
                    <dd className="font-medium capitalize text-gray-900">{customer.tier ?? 'bronze'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">累計利用額</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">登録日</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDate(customer.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">最終更新</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDate(customer.updatedAt)}
                    </dd>
                  </div>
                  {customer.birthday && (
                    <div>
                      <dt className="text-gray-500">誕生日</dt>
                      <dd className="font-medium text-gray-900">{customer.birthday}</dd>
                    </div>
                  )}
                </dl>

                {(customer.address || customer.tags?.length || customer.notes) && (
                  <div className="mt-4 space-y-3 text-sm">
                    {customer.address && (
                      <div>
                        <h4 className="font-semibold text-gray-700">住所</h4>
                        <p className="text-gray-600">
                          {customer.address.prefecture ?? customer.prefecture ?? ''}
                          {customer.address.city ?? customer.city ?? ''}
                          {customer.address.street ?? customer.street ?? ''}
                        </p>
                      </div>
                    )}
                    {customer.tags?.length ? (
                      <div>
                        <h4 className="font-semibold text-gray-700">タグ</h4>
                        <div className="flex flex-wrap gap-2">
                          {customer.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {customer.notes && (
                      <div>
                        <h4 className="font-semibold text-gray-700">メモ</h4>
                        <p className="whitespace-pre-wrap text-gray-600">{customer.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                <a
                  href={`/admin/customers/${customer.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-dark-gold"
                >
                  個別管理ページを開く ↗
                </a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">総予約件数</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.total}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">未承認</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-600">{summary.pending}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">今後の予約</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{summary.upcoming}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">確定済み</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-600">{summary.confirmed}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">完了済み</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{summary.completed}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">キャンセル</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-500">{summary.cancelled}</p>
                </div>
              </div>

              {summary.lastReservation && (
                <div className="rounded-lg border border-gray-200 p-4 text-sm">
                  <h3 className="font-semibold text-gray-700">最新の予約</h3>
                  <p className="mt-2 text-gray-900">
                    {summary.lastReservation.date} {summary.lastReservation.time} / {summary.lastReservation.serviceName}
                  </p>
                  <p className="text-gray-600">
                    ステータス: {summary.lastReservation.status}
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-700">最近の予約</h3>
                </div>
                <div className="max-h-64 overflow-y-auto px-4 py-3">
                  {reservations.length === 0 ? (
                    <p className="text-sm text-gray-500">予約履歴がありません。</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {reservations.slice(0, 5).map((reservation) => (
                        <li
                          key={reservation.id}
                          className="rounded-md border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              {reservation.date} {reservation.time}
                            </p>
                            <span className="text-xs font-semibold uppercase text-gray-500">
                              {reservation.status}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700">{reservation.serviceName}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(reservation.price)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  追加情報を取得できませんでした: {errorMessage}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
