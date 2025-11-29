'use client'

import { useEffect, useMemo, useState } from 'react'

import { Reservation, TimeSlot } from '@/lib/types'
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
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceType: serviceOptions[0].value,
    notes: '',
  })
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
    loadSlots(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

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
        body: JSON.stringify({ blockedDates: next ? [date] : [] }),
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

    const service = serviceOptions.find((s) => s.value === form.serviceType) || serviceOptions[0]

    try {
      setSubmitting(true)
      const newReservation = await reservationService.createReservation(
        {
          customerId: null,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          serviceType: service.value,
          serviceName: service.name,
          price: service.price,
          date,
          time: selectedTime,
          status: 'confirmed',
          notes: form.notes,
          maintenanceOptions: [],
          maintenancePrice: 0,
          totalPrice: service.price,
          finalPrice: service.price,
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サービス</label>
            <select
              value={form.serviceType}
              onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
