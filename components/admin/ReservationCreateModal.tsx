'use client'

import { useEffect, useMemo, useState } from 'react'

import { apiClient } from '@/lib/api/client'
import { getAllServicePlans, getServicePlans } from '@/lib/firebase/servicePlans'
import { Reservation, TimeSlot, Customer, ServicePlan } from '@/lib/types'
import { reservationService } from '@/lib/reservationService'

interface ReservationCreateModalProps {
  date: string
  adminUserId?: string
  onClose: () => void
  onCreated?: (reservation: Reservation) => void
  onToggleBlock?: (date: string, nextBlocked: boolean) => Promise<void>
  isBlocked?: boolean
}

const serviceOptions = [
  { value: '2D', label: '2D - パウダーブロウ', name: 'パウダーブロウ', price: 22000 },
  { value: '3D', label: '3D - フェザーブロウ', name: 'フェザーブロウ', price: 23000 },
  { value: '4D', label: '4D - パウダー&フェザー', name: 'パウダー&フェザー', price: 25000 },
]

export default function ReservationCreateModal({
  date,
  adminUserId,
  onClose,
  onCreated,
  onToggleBlock,
  isBlocked: initialBlocked = false,
}: ReservationCreateModalProps) {
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceType: serviceOptions[0].value,
    serviceName: serviceOptions[0].name,
    servicePrice: serviceOptions[0].price,
    notes: '',
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [isCustomService, setIsCustomService] = useState(false)

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isBlocked, setIsBlocked] = useState(initialBlocked)
  const [togglingBlock, setTogglingBlock] = useState(false)

  const formattedDateLabel = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }, [date])

  useEffect(() => {
    const fetchInitial = async () => {
      const [customersResult, plansResult] = await Promise.allSettled([
        apiClient.getAdminCustomers({ limit: 200 }),
        (async () => {
          const plansFromFirestore = await getAllServicePlans()
          if (plansFromFirestore?.length) return plansFromFirestore
          const published = await getServicePlans()
          if (published?.length) return published
          return apiClient.getPublishedServicePlans()
        })(),
      ])

      if (customersResult.status === 'fulfilled') {
        setCustomers(customersResult.value?.customers || [])
      } else {
        console.warn('Failed to load customers', customersResult.reason)
      }

      if (plansResult.status === 'fulfilled' && plansResult.value?.length) {
        setServicePlans(plansResult.value)
        setSelectedServiceId(plansResult.value[0].id)
        applyServicePlan(plansResult.value[0])
      } else {
        console.warn('Failed to load service plans', plansResult.status === 'rejected' ? plansResult.reason : 'empty')
      }
    }

    fetchInitial()
  }, [])

  useEffect(() => {
    loadSlots(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const applyServicePlan = (plan?: ServicePlan) => {
    if (!plan) return
    setIsCustomService(false)
    setSelectedServiceId(plan.id)
    setForm((prev) => ({
      ...prev,
      serviceType: plan.type || prev.serviceType,
      serviceName: plan.name || prev.serviceName,
      servicePrice: typeof plan.price === 'number' ? plan.price : prev.servicePrice,
    }))
  }

  const handleCustomerSelect = (customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name || prev.customerName,
      customerEmail: customer.email || prev.customerEmail,
      customerPhone: customer.phone || prev.customerPhone,
    }))
    setCustomerSearch(customer.name || customer.email || '')
  }

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aKey = (a.name || a.email || '').toString()
      const bKey = (b.name || b.email || '').toString()
      return aKey.localeCompare(bKey, 'ja')
    })
  }, [customers])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return sortedCustomers.slice(0, 20)
    const keyword = customerSearch.toLowerCase()
    const phoneDigits = customerSearch.replace(/\D/g, '')
    return sortedCustomers
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(keyword)
        const emailMatch = c.email?.toLowerCase().includes(keyword)
        const phoneMatch = phoneDigits
          ? (c.phone || '').replace(/\D/g, '').includes(phoneDigits)
          : false
        return nameMatch || emailMatch || phoneMatch
      })
      .slice(0, 20)
  }, [customerSearch, sortedCustomers])

  const selectableServices = useMemo(() => {
    if (servicePlans.length > 0) return servicePlans
    const nowIso = new Date().toISOString()
    return serviceOptions.map((opt, index) => ({
      id: opt.value,
      type: opt.value,
      name: opt.name,
      description: opt.label,
      price: opt.price,
      duration: 60,
      isPublished: true,
      effectiveFrom: nowIso,
      displayOrder: index + 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    })) as ServicePlan[]
  }, [servicePlans])

  useEffect(() => {
    if (!selectedServiceId && selectableServices.length > 0) {
      applyServicePlan(selectableServices[0])
    }
  }, [selectableServices, selectedServiceId])

  const handleServiceSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustomService(true)
      setSelectedServiceId('')
      setForm((prev) => ({
        ...prev,
        serviceType: 'custom',
        serviceName: '',
        servicePrice: 0,
      }))
      return
    }

    const plan = selectableServices.find((p) => p.id === value)
    if (plan) {
      applyServicePlan(plan)
    }
  }

  const loadSlots = async (targetDate: string) => {
    try {
      setLoadingSlots(true)
      const response = await fetch(`/api/reservations/by-date?date=${targetDate}`)
      if (!response.ok) {
        throw new Error('時間枠の取得に失敗しました')
      }
      const data = await response.json()
      setTimeSlots(data.timeSlots || [])
      setIsBlocked(data.blocked || false)

      const firstAvailable = (data.timeSlots || []).find((slot: TimeSlot) => slot.available)
      setSelectedTime(firstAvailable?.time || '')
    } catch (error) {
      console.error(error)
      setTimeSlots([])
      setSelectedTime('')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleToggleBlock = async () => {
    if (!onToggleBlock) return
    const next = !isBlocked
    try {
      setTogglingBlock(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      // サーバーAPI経由で保存（Admin設定に統一）
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ blockedDate: date, block: next }),
      })

      await onToggleBlock(date, next)
      setIsBlocked(next)

      if (next) {
        // 受付停止にしたらモーダルを閉じる
        setTimeSlots([])
        setSelectedTime('')
        onClose()
      } else {
        // 受付再開したら空き枠を再取得
        loadSlots(date)
      }
    } finally {
      setTogglingBlock(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedTime) {
      alert('時間を選択してください')
      return
    }

    if (!form.customerName || !form.customerEmail || !form.customerPhone) {
      alert('お名前・メール・電話を入力してください')
      return
    }

    const selectedPlan = servicePlans.find((p) => p.id === selectedServiceId)
    const fallbackOption = serviceOptions.find((s) => s.value === form.serviceType) || serviceOptions[0]
    const serviceName = form.serviceName?.trim() || selectedPlan?.name || fallbackOption.name
    const serviceType = selectedPlan?.type || form.serviceType || fallbackOption.value
    const price = Number(form.servicePrice || selectedPlan?.price || fallbackOption.price || 0)

    if (!serviceName) {
      alert('サービス名を入力してください')
      return
    }
    if (!(price > 0)) {
      alert('料金を入力してください')
      return
    }

    const durationMinutes = typeof selectedPlan?.duration === 'number' ? selectedPlan.duration : undefined

    try {
      setSubmitting(true)
      const newReservation = await reservationService.createReservation(
        {
          customerId: form.customerId || null,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          serviceType,
          serviceName,
          price,
          durationMinutes,
          date,
          time: selectedTime,
          status: 'confirmed',
          notes: form.notes,
          maintenanceOptions: [],
          maintenancePrice: 0,
          totalPrice: price,
          finalPrice: price,
          pointsUsed: 0,
          updatedAt: new Date(),
        },
        adminUserId,
      )

      onCreated?.(newReservation)
      onClose()
    } catch (error: any) {
      console.error('Failed to create reservation:', error)
      alert(error.message || '予約の作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const availableTimes = timeSlots.filter((slot) => slot.available)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">新規予約の作成</p>
            <h2 className="text-2xl font-bold">{formattedDateLabel}</h2>
          </div>
          <div className="flex gap-2">
            {onToggleBlock && (
              <button
                onClick={handleToggleBlock}
                disabled={togglingBlock}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isBlocked ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {togglingBlock
                  ? '保存中...'
                  : isBlocked
                    ? '受付停止を解除'
                    : 'この日を受付停止'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        {isBlocked && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            この日は受付停止に設定されています。解除すると空き時間を再取得できます。
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              顧客検索（名前 / メール / 電話）
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 120)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="例）山田、080、mail@example.com"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto border rounded-lg bg-white shadow-lg">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleCustomerSelect(c)
                      setShowCustomerDropdown(false)
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary/10"
                  >
                    <span className="font-semibold mr-2">{c.name || '名称未登録'}</span>
                    <span className="text-gray-500 mr-2">{c.email || 'メールなし'}</span>
                    <span className="text-gray-500">{c.phone || '電話なし'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="山田 花子"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="090-1234-5678"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="example@mail.com"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サービス（登録一覧から選択 or 手入力）
            </label>
            <select
              value={isCustomService ? 'custom' : selectedServiceId}
              onChange={(e) => handleServiceSelect(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {selectableServices.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} / {plan.type} / ¥{Number(plan.price || 0).toLocaleString()}
                </option>
              ))}
              <option value="custom">カスタム入力（直書き）</option>
            </select>
            <p className="text-xs text-gray-500">選択するとサービス名・金額を自動入力します。上書きも可能です。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サービス名</label>
            <input
              type="text"
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="メニュー名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">料金（円）</label>
            <input
              type="number"
              value={form.servicePrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  servicePrice: Number(e.target.value) || 0,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
              min={0}
              step={500}
              placeholder="22000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
            <div className="relative">
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingSlots || isBlocked || availableTimes.length === 0}
              >
                {loadingSlots && <option value="">取得中...</option>}
                {!loadingSlots && availableTimes.length === 0 && <option value="">空き枠なし</option>}
                {!loadingSlots &&
                  availableTimes.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
              </select>
              {loadingSlots && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-500">読み込み中...</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="確認事項などがあれば入力してください"
            />
          </div>
        </div>

        {availableTimes.length === 0 && !isBlocked && (
          <p className="text-sm text-gray-600 mb-4">
            この日は現在空き枠がありません。別の日付を選択するか、既存予約を調整してください。
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting || isBlocked || !selectedTime}
            className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-dark-gold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? '作成中...' : '予約を作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
