'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import type { AdminCreateReservationPayload } from '@/lib/api/client'
import type { Customer, ServicePlan, TimeSlot } from '@/lib/types'

interface ReservationCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: AdminCreateReservationPayload) => Promise<void>
  customers: Customer[]
  services: ServicePlan[]
  defaultDate?: string
  defaultTime?: string
  loadingOptions?: boolean
  loadingMoreCustomers?: boolean
  hasMoreCustomers?: boolean
  onLoadMoreCustomers?: () => Promise<void>
  onReloadCustomers?: () => Promise<void>
  onRefreshServices?: () => Promise<void>
  refreshingServices?: boolean
}

const initialFormState = ({
  date,
  time,
}: {
  date?: string
  time?: string
}): AdminCreateReservationPayload & { customerName: string; customerEmail?: string; customerPhone?: string } => ({
  customerId: undefined,
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  serviceId: undefined,
  serviceName: '',
  serviceType: '2D',
  price: 0,
  maintenanceOptions: undefined,
  maintenancePrice: undefined,
  totalPrice: undefined,
  date: date ?? '',
  time: time ?? '',
  durationMinutes: undefined,
  notes: '',
  status: 'confirmed',
  finalPrice: undefined,
  pointsUsed: undefined,
  cancelReason: undefined,
  isMonitor: false,
  allowConflict: false,
})

const emptySlots: TimeSlot[] = []

export default function ReservationCreateModal({
  isOpen,
  onClose,
  onSubmit,
  customers,
  services,
  defaultDate,
  defaultTime,
  loadingOptions = false,
  loadingMoreCustomers = false,
  hasMoreCustomers = false,
  onLoadMoreCustomers,
  onReloadCustomers,
  onRefreshServices,
  refreshingServices = false,
}: ReservationCreateModalProps) {
  const [form, setForm] = useState(() => initialFormState({ date: defaultDate, time: defaultTime }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slotCandidates, setSlotCandidates] = useState<TimeSlot[]>(emptySlots)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm((prev) =>
        initialFormState({
          date: defaultDate ?? prev.date,
          time: defaultTime ?? prev.time,
        }),
      )
      setError(null)
      setSlotCandidates(emptySlots)
      if (defaultDate) {
        void loadSlots(defaultDate)
      }
    }
  }, [isOpen, defaultDate, defaultTime])
  useEffect(() => {
    setSearchTerm('')
  }, [isOpen])

  const customerOptions = useMemo(() => {
    return [...customers].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [customers])

  const serviceOptions = useMemo(() => {
    return services
      .filter((service) => service.isPublished !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  }, [services])

  const filteredCustomers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) {
      return customerOptions
    }
    return customerOptions.filter((customer) => {
      const nameMatch = customer.name?.toLowerCase().includes(keyword)
      const emailMatch = customer.email?.toLowerCase().includes(keyword)
      const phoneMatch = customer.phone?.toLowerCase().includes(keyword)
      return Boolean(nameMatch || emailMatch || phoneMatch)
    })
  }, [customerOptions, searchTerm])

  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      setForm((prev) => ({
        ...prev,
        customerId: undefined,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
      }))
      return
    }

    const customer = customerOptions.find((item) => item.id === customerId)
    if (!customer) {
      return
    }

    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer.name ?? '',
      customerEmail: customer.email ?? '',
      customerPhone: customer.phone ?? '',
    }))
  }

  const handleServiceSelect = (serviceId: string) => {
    if (!serviceId) {
      setForm((prev) => ({
        ...prev,
        serviceId: undefined,
        serviceName: '',
        serviceType: '2D',
        price: 0,
        durationMinutes: undefined,
      }))
      return
    }

    const service = serviceOptions.find((item) => item.id === serviceId)
    if (!service) {
      return
    }

    setForm((prev) => ({
      ...prev,
      serviceId,
      serviceName: service.name,
      serviceType: service.type,
      price: service.price,
      durationMinutes: typeof service.duration === 'number' ? service.duration : prev.durationMinutes,
      totalPrice: service.price,
    }))
  }

  const loadSlots = async (date: string) => {
    if (!date) {
      setSlotCandidates(emptySlots)
      return
    }

    setSlotsLoading(true)
    try {
      const response = await fetch(`/api/reservations/by-date?date=${encodeURIComponent(date)}`)
      if (!response.ok) {
        throw new Error('時間枠の取得に失敗しました')
      }
      const data = await response.json()
      const slots: TimeSlot[] = Array.isArray(data.timeSlots) ? data.timeSlots : []
      setSlotCandidates(slots)
    } catch (slotError) {
      console.warn('Failed to fetch time slots', slotError)
      setSlotCandidates(emptySlots)
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleDateChange = (date: string) => {
    setForm((prev) => ({
      ...prev,
      date,
    }))
    void loadSlots(date)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!form.customerName.trim()) {
      setError('顧客名を入力してください')
      return
    }
    if (!form.serviceName.trim()) {
      setError('サービスを選択してください')
      return
    }
    if (!form.date) {
      setError('日付を選択してください')
      return
    }
    if (!form.time) {
      setError('時間を入力してください')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        ...form,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail?.trim() ?? '',
        customerPhone: form.customerPhone?.trim() ?? '',
        price: Number(form.price ?? 0),
        totalPrice:
          form.totalPrice !== undefined
            ? Number(form.totalPrice)
            : Number(form.price ?? 0) +
              (form.maintenancePrice !== undefined ? Number(form.maintenancePrice) : 0),
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '予約の作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const availableSlotTimes = useMemo(() => {
    if (!Array.isArray(slotCandidates)) {
      return []
    }
    return slotCandidates
      .filter((slot) => slot.available || form.allowConflict)
      .map((slot) => slot.time)
      .filter((time, index, self) => self.indexOf(time) === index)
      .sort()
  }, [slotCandidates, form.allowConflict])

  if (!isOpen) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">新規予約の作成</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={saving}
            >
              閉じる
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {loadingOptions && (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                選択肢を読み込み中です…
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">顧客</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="admin-existing-customer-search"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    既存顧客検索
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        id="admin-existing-customer-search"
                        type="text"
                        className="flex-1 rounded-lg border px-3 py-2 text-sm"
                        placeholder="名前・メール・電話で検索"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        disabled={saving || loadingOptions}
                      />
                      {onReloadCustomers && (
                        <button
                          type="button"
                          onClick={() => {
                            void onReloadCustomers()
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                          disabled={saving || loadingOptions}
                        >
                          再読込
                        </button>
                        )}
                    </div>
                    <label
                      htmlFor="admin-existing-customer-select"
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      顧客を選択
                    </label>
                    <select
                      id="admin-existing-customer-select"
                      value={form.customerId ?? ''}
                      onChange={(event) => handleCustomerSelect(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      disabled={saving}
                    >
                      <option value="">選択しない（手入力）</option>
                      {filteredCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}（{customer.email}）
                        </option>
                      ))}
                    </select>
                    {searchTerm && filteredCustomers.length === 0 && (
                      <p className="text-xs text-red-500">該当する顧客が見つかりませんでした</p>
                    )}
                    {hasMoreCustomers && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onLoadMoreCustomers) {
                            void onLoadMoreCustomers()
                          }
                        }}
                        className="self-start rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                        disabled={saving || loadingMoreCustomers}
                      >
                        {loadingMoreCustomers ? '読み込み中…' : 'さらに読み込む'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="admin-customer-name"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    お名前 *
                  </label>
                  <input
                    id="admin-customer-name"
                    type="text"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.customerName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerName: event.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-customer-email"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="admin-customer-email"
                    type="email"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.customerEmail ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-customer-phone"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    電話番号
                  </label>
                  <input
                    id="admin-customer-phone"
                    type="tel"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.customerPhone ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerPhone: event.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-customer-notes"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    顧客メモ
                  </label>
                  <textarea
                    id="admin-customer-notes"
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.notes ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">サービス</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="admin-service-select"
                      className="text-xs font-medium text-gray-600"
                    >
                      メニュー
                    </label>
                    {onRefreshServices && (
                      <button
                        type="button"
                        onClick={() => {
                          void onRefreshServices()
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                        disabled={saving || refreshingServices}
                      >
                        {refreshingServices ? '再取得中…' : '最新のプランを取得'}
                      </button>
                    )}
                  </div>
                  <select
                    id="admin-service-select"
                    value={form.serviceId ?? ''}
                    onChange={(event) => handleServiceSelect(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={saving}
                  >
                    <option value="">直接入力</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}（¥{service.price.toLocaleString()}）
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="admin-service-name"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    サービス名 *
                  </label>
                  <input
                    id="admin-service-name"
                    type="text"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.serviceName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, serviceName: event.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-service-type"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    サービス種別
                  </label>
                  <select
                    id="admin-service-type"
                    value={form.serviceType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        serviceType: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={saving}
                  >
                    <option value="2D">2D</option>
                    <option value="3D">3D</option>
                    <option value="4D">4D</option>
                    <option value="wax">wax</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="admin-service-price"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    料金 (税込)
                  </label>
                  <input
                    id="admin-service-price"
                    type="number"
                    min={0}
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.price}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        price: Number(event.target.value),
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-service-duration"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    施術時間 (分)
                  </label>
                  <input
                    id="admin-service-duration"
                    type="number"
                    min={0}
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.durationMinutes ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        durationMinutes: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-reservation-status"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    ステータス
                  </label>
                  <select
                    id="admin-reservation-status"
                    value={form.status ?? 'confirmed'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as AdminCreateReservationPayload['status'],
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={saving}
                  >
                    <option value="pending">承認待ち</option>
                    <option value="confirmed">確定</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">日時</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="admin-reservation-date"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    日付 *
                  </label>
                  <input
                    id="admin-reservation-date"
                    type="date"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.date}
                    onChange={(event) => handleDateChange(event.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-reservation-time"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    時間 *
                  </label>
                  <input
                    id="admin-reservation-time"
                    type="time"
                    step={1800}
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        time: event.target.value,
                      }))
                    }
                    list="admin-reservation-slot-options"
                    disabled={saving}
                  />
                  <datalist id="admin-reservation-slot-options">
                    {availableSlotTimes.map((time) => (
                      <option value={time} key={time} />
                    ))}
                  </datalist>
                  {slotsLoading && (
                    <p className="mt-1 text-xs text-gray-500">時間枠を確認しています…</p>
                  )}
                  {!slotsLoading && !form.allowConflict && form.date && availableSlotTimes.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      現在の設定では空き枠が見つかりません。必要なら「空きがなくても作成する」にチェックしてください。
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    id="allow-conflict"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.allowConflict ?? false}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        allowConflict: event.target.checked,
                      }))
                    }
                    disabled={saving}
                  />
                  <label htmlFor="allow-conflict" className="text-xs text-gray-600">
                    空きがなくても作成する（ダブルブッキングを許容）
                  </label>
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-dark-gold disabled:opacity-60"
              disabled={saving}
            >
              {saving ? '作成中…' : '予約を作成する'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
