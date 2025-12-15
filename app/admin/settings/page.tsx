'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { cloneDefaultSettings, validateReservationSettings } from '@/lib/utils/reservationSettings'

import type { BusinessHours, ReservationSettings } from '@/lib/types'

const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

const parseSlotsInput = (value: string): string[] =>
  value
    .split(',')
    .map((slot) => slot.trim())
    .filter((slot) => timePattern.test(slot))

const toMinutes = (time: string): number | null => {
  if (!timePattern.test(time)) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

const toTime = (minutes: number): string => {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const buildStartSlots = (
  open: string,
  close: string,
  slotDuration: number,
  interval: number,
): string[] => {
  const openMin = toMinutes(open)
  const closeMin = toMinutes(close)
  if (openMin === null || closeMin === null) return []
  if (!Number.isFinite(slotDuration) || slotDuration <= 0) return []
  const lastStart = closeMin - slotDuration
  if (lastStart < openMin) return []
  const step = Number.isFinite(interval) && interval > 0 ? interval : 30
  const slots: string[] = []
  for (let t = openMin; t <= lastStart; t += step) {
    slots.push(toTime(t))
  }
  return slots
}

const loadFromLocalStorage = (): ReservationSettings => {
  if (typeof window === 'undefined') {
    return cloneDefaultSettings()
  }
  try {
    const raw = window.localStorage.getItem('reservationSettings')
    if (!raw) {
      return cloneDefaultSettings()
    }
    const parsed = JSON.parse(raw) as ReservationSettings
    return {
      ...cloneDefaultSettings(),
      ...parsed,
    }
  } catch {
    return cloneDefaultSettings()
  }
}

const persistToLocalStorage = (settings: ReservationSettings) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem('reservationSettings', JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<ReservationSettings>(cloneDefaultSettings())
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isFallbackData, setIsFallbackData] = useState(false)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [newOverrideDate, setNewOverrideDate] = useState('')
  const [newOverrideSlots, setNewOverrideSlots] = useState('')
  const [openSections, setOpenSections] = useState<{
    basic: boolean
    cancellation: boolean
    businessHours: boolean
    blockedDates: boolean
    dateOverrides: boolean
  }>({
    basic: false,
    cancellation: false,
    businessHours: false,
    blockedDates: false,
    dateOverrides: false,
  })

  const toggleSection = (
    key: 'basic' | 'cancellation' | 'businessHours' | 'blockedDates' | 'dateOverrides',
  ) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage(text)
    setMessageType(type)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setMessage(''), type === 'success' ? 3000 : 5000)
    }
  }

  const loadSettings = async (options: { silent?: boolean } = {}) => {
    if (options.silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      setWarningMessage(null)
      const response = await apiClient.getAdminSettings()
      const normalizedSettings = {
        ...response.settings,
        dateOverrides: response.settings.dateOverrides ?? {},
      }
      setSettings(normalizedSettings)
      persistToLocalStorage(normalizedSettings)
      setIsFallbackData(Boolean(response.fallback))
      if (response.warning) {
        setWarningMessage(response.warning)
      }
    } catch (error) {
      console.error('Failed to load reservation settings:', error)
      const fallbackSettings = loadFromLocalStorage()
      setSettings(fallbackSettings)
      setIsFallbackData(true)
      setWarningMessage('Firestoreから設定を取得できなかったため、ローカルに保存された設定を表示しています。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') {
      router.replace('/login')
      return
    }

    void loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router])

  const handleBusinessHoursChange = (
    dayIndex: number,
    field: keyof BusinessHours,
    value: string | boolean | number | string[],
  ) => {
    setSettings((prev) => {
      const updated = [...prev.businessHours]
      updated[dayIndex] = {
        ...updated[dayIndex],
        [field]: value,
      }
      return { ...prev, businessHours: updated }
    })
  }

  const handleExtendCloseToFitDuration = (dayIndex: number) => {
    const hours = settings.businessHours[dayIndex]
    if (!hours) {
      notify('error', '営業時間データが見つかりません。')
      return
    }

    const closeMin = toMinutes(hours.close)
    if (closeMin === null) {
      notify('error', '終了時間（close）の形式が正しくありません。')
      return
    }

    const slotDuration = settings.slotDuration
    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      notify('error', '予約枠（所要時間）が不正です。')
      return
    }

    const extendedCloseMin = closeMin + slotDuration
    if (extendedCloseMin >= 24 * 60) {
      notify(
        'error',
        `所要時間（${slotDuration}分）を足すと日付をまたぐため、自動補正できません。終了時間を手動で調整してください。`,
      )
      return
    }

    const fixedClose = toTime(extendedCloseMin)
    handleBusinessHoursChange(dayIndex, 'close', fixedClose)
    notify('success', `終了時間を ${fixedClose} に補正しました（close=最終受付+${slotDuration}分）。`)
  }

  const handleAddDateOverride = () => {
    if (!newOverrideDate) {
      return
    }
    const slots = parseSlotsInput(newOverrideSlots)
    setSettings((prev) => {
      const overrides = { ...(prev.dateOverrides ?? {}) }
      if (slots.length === 0) {
        delete overrides[newOverrideDate]
      } else {
        overrides[newOverrideDate] = { allowedSlots: slots }
      }
      return {
        ...prev,
        dateOverrides: overrides,
      }
    })
    setNewOverrideDate('')
    setNewOverrideSlots('')
  }

  const handleRemoveDateOverride = (date: string) => {
    setSettings((prev) => {
      const updated = { ...(prev.dateOverrides ?? {}) }
      delete updated[date]
      return { ...prev, dateOverrides: updated }
    })
  }

  const requireLiveData = () => {
    if (!isFallbackData) {
      return true
    }
    alert('Firestoreとの接続を復旧し、「再読込」で最新データを取得してから保存を実行してください。')
    return false
  }

  const handleSaveSettings = async () => {
    if (!requireLiveData()) {
      return
    }

    setSaving(true)
    try {
      const validation = validateReservationSettings(settings)
      if (!validation.ok) {
        notify('error', validation.errors.join(' / '))
        return
      }

      const response = await apiClient.updateAdminSettings(settings)
      if (!response.success) {
        notify('error', response.message ?? '設定の保存に失敗しました。')
        return
      }

      const normalizedSettings = {
        ...response.settings,
        dateOverrides: response.settings.dateOverrides ?? {},
      }
      setSettings(normalizedSettings)
      persistToLocalStorage(normalizedSettings)
      setIsFallbackData(false)
      notify('success', '設定を保存しました。')
    } catch (error) {
      console.error('Failed to save reservation settings:', error)
      notify('error', '設定の保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !settings.blockedDates?.includes(newBlockedDate)) {
      setSettings((prev) => ({
        ...prev,
        blockedDates: [...(prev.blockedDates ?? []), newBlockedDate],
      }))
      setNewBlockedDate('')
    }
  }

  const handleRemoveBlockedDate = (date: string) => {
    setSettings((prev) => ({
      ...prev,
      blockedDates: prev.blockedDates?.filter((d) => d !== date) || [],
    }))
  }

  const handleReload = () => {
    void loadSettings({ silent: true })
  }

  const applySettingsResponse = (next: ReservationSettings) => {
    const normalizedSettings = {
      ...next,
      dateOverrides: next.dateOverrides ?? {},
    }
    setSettings(normalizedSettings)
    persistToLocalStorage(normalizedSettings)
    setIsFallbackData(false)
  }

  const handleClearBlockedDatesAll = async () => {
    const count = settings.blockedDates?.length ?? 0
    if (count === 0) {
      notify('success', 'ブロック日はすでに空です。')
      return
    }

    const ok = window.confirm(`ブロック日を全て削除します（${count}件）。よろしいですか？`)
    if (!ok) return

    setSaving(true)
    try {
      const response = await apiClient.updateAdminSettingsPartial({ clearBlockedDates: true })
      if (!response.success) {
        notify('error', response.message ?? 'ブロック日の全削除に失敗しました。')
        return
      }
      applySettingsResponse(response.settings)
      notify('success', 'ブロック日を全て削除しました。')
    } catch (error) {
      console.error('Failed to clear blocked dates:', error)
      notify('error', 'ブロック日の全削除に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const handleClearDateOverridesAll = async () => {
    const count = Object.keys(settings.dateOverrides ?? {}).length
    if (count === 0) {
      notify('success', '日付別固定枠はすでに空です。')
      return
    }

    const ok = window.confirm(`日付別固定枠を全て削除します（${count}件）。よろしいですか？`)
    if (!ok) return

    setSaving(true)
    try {
      const response = await apiClient.updateAdminSettingsPartial({ clearDateOverrides: true })
      if (!response.success) {
        notify('error', response.message ?? '日付別固定枠の全削除に失敗しました。')
        return
      }
      applySettingsResponse(response.settings)
      notify('success', '日付別固定枠を全て削除しました。')
    } catch (error) {
      console.error('Failed to clear date overrides:', error)
      notify('error', '日付別固定枠の全削除に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettingsToDefault = async () => {
    const ok = window.confirm(
      '予約設定を初期状態（デフォルト）に戻します。よろしいですか？\n※ ブロック日/日付別固定枠/営業時間等も全て初期化されます。',
    )
    if (!ok) return

    setSaving(true)
    try {
      const response = await apiClient.updateAdminSettingsPartial({ resetToDefault: true })
      if (!response.success) {
        notify('error', response.message ?? '設定の初期化に失敗しました。')
        return
      }
      applySettingsResponse(response.settings)
      notify('success', '予約設定を初期状態に戻しました。')
    } catch (error) {
      console.error('Failed to reset settings:', error)
      notify('error', '設定の初期化に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4">設定を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold">予約システム設定</h1>
        <button
          onClick={handleReload}
          disabled={refreshing}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {refreshing ? '再読込中…' : '再読込'}
        </button>
      </div>

      {isFallbackData && (
        <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          Firestoreとの接続に問題が発生したため、ローカルに保存された設定を表示しています。接続が復旧したら「再読込」で最新データを取得してください。
        </div>
      )}

      {warningMessage && !isFallbackData && (
        <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {warningMessage}
        </div>
      )}

      {message && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
          <div
            role="status"
            aria-live={messageType === 'success' ? 'polite' : 'assertive'}
            className={`pointer-events-auto w-full max-w-lg rounded-lg border px-5 py-4 shadow-xl ${
              messageType === 'success'
                ? 'border-green-300 bg-green-50 text-green-900'
                : 'border-red-300 bg-red-50 text-red-900'
            }`}
          >
            {message}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('basic')}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left hover:bg-gray-50"
          aria-expanded={openSections.basic}
        >
          <div>
            <h2 className="text-xl font-semibold">基本設定</h2>
            <p className="mt-1 text-sm text-gray-600">予約枠の長さ、1枠あたりの最大数</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {openSections.basic ? '閉じる' : '開く'}
          </span>
        </button>

        {openSections.basic && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="slotDuration">
                  予約枠の長さ（分）
                </label>
                <input
                  id="slotDuration"
                  type="number"
                  value={settings.slotDuration}
                  onChange={(event) =>
                    setSettings({ ...settings, slotDuration: parseInt(event.target.value, 10) || 120 })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="30"
                  step="30"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="maxCapacityPerSlot"
                >
                  1枠あたりの最大予約数
                </label>
                <input
                  id="maxCapacityPerSlot"
                  type="number"
                  value={settings.maxCapacityPerSlot}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      maxCapacityPerSlot: parseInt(event.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('cancellation')}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left hover:bg-gray-50"
          aria-expanded={openSections.cancellation}
        >
          <div>
            <h2 className="text-xl font-semibold">キャンセルポリシー設定</h2>
            <p className="mt-1 text-sm text-gray-600">期限（何時間前まで）と表示文言</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {openSections.cancellation ? '閉じる' : '開く'}
          </span>
        </button>

        {openSections.cancellation && (
          <div className="px-6 pb-6">
            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="cancellationDeadlineHours"
                >
                  キャンセル可能期限（予約日の何時間前まで）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="cancellationDeadlineHours"
                    type="number"
                    value={settings.cancellationDeadlineHours || 72}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        cancellationDeadlineHours: parseInt(event.target.value, 10) || 72,
                      })
                    }
                    className="w-32 rounded-lg border px-3 py-2"
                    min="1"
                    max="168"
                  />
                  <span className="text-gray-600">時間前まで</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  ※ お客様がオンラインでキャンセルできる期限を設定します（1〜168時間）
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cancellationPolicy">
                  キャンセルポリシー説明文
                </label>
                <textarea
                  id="cancellationPolicy"
                  value={settings.cancellationPolicy || ''}
                  onChange={(event) => setSettings({ ...settings, cancellationPolicy: event.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                  rows={4}
                  placeholder="予約フォームに表示されるキャンセルポリシーの説明文を入力してください"
                />
                <p className="mt-1 text-sm text-gray-500">
                  ※ 予約フォームで表示されるキャンセルポリシーの説明文です
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('businessHours')}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left hover:bg-gray-50"
          aria-expanded={openSections.businessHours}
        >
          <div>
            <h2 className="text-xl font-semibold">営業日・営業時間</h2>
            <p className="mt-1 text-sm text-gray-600">営業時間（open/close）と開始可能時刻（最終受付運用）</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {openSections.businessHours ? '閉じる' : '開く'}
          </span>
        </button>

        {openSections.businessHours && (
          <div className="px-6 pb-6">
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">最終受付（開始時刻）で運用する場合のおすすめ</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">終了時間（close）</span>は「施術が終わる時間」まで含めて設定してください（例:
                  最終受付19:00・施術180分なら close は22:00）。
                </li>
                <li>
                  「開始可能時刻（カンマ区切り）」に <span className="font-semibold">18:00, 19:00</span>{' '}
                  のように開始したい時刻だけを入れると、その時刻のみ枠が表示されます。
                </li>
              </ul>
            </div>

            <div className="overflow-x-auto">
              <table className="admin-table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">曜日</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">営業</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">開始時間</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">終了時間</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">最大予約数/日</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">複数枠</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">枠間隔（分）</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      開始可能時刻（カンマ区切り）
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {settings.businessHours.map((hours, index) => (
                    <tr key={daysOfWeek[index]}>
                  <td className="px-4 py-2 text-sm text-gray-700" data-label="曜日">
                    {daysOfWeek[index]}
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="営業">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(hours.isOpen)}
                        onChange={(event) => handleBusinessHoursChange(index, 'isOpen', event.target.checked)}
                        className="h-4 w-4"
                      />
                      営業
                    </label>
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="開始時間">
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(event) => handleBusinessHoursChange(index, 'open', event.target.value)}
                      className="rounded border px-2 py-1"
                      disabled={!hours.isOpen}
                    />
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="終了時間">
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(event) => handleBusinessHoursChange(index, 'close', event.target.value)}
                      className="rounded border px-2 py-1"
                      disabled={!hours.isOpen}
                    />
                    {(() => {
                      if (!hours.isOpen) return null
                      const openMin = toMinutes(hours.open)
                      const closeMin = toMinutes(hours.close)
                      if (openMin === null || closeMin === null) return null
                      const lastStart = closeMin - settings.slotDuration
                      if (lastStart >= openMin) return null
                      return (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-red-600">
                            所要時間（{settings.slotDuration}分）に対して終了時間が短い可能性があります（最終受付運用なら
                            close を「施術終了」まで延長してください）。
                          </p>
                          <button
                            type="button"
                            onClick={() => handleExtendCloseToFitDuration(index)}
                            className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            施術終了に補正（close=最終受付+所要時間）
                          </button>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="最大予約数/日">
                    <input
                      type="number"
                      value={hours.maxCapacityPerDay ?? 1}
                      onChange={(event) =>
                        handleBusinessHoursChange(
                          index,
                          'maxCapacityPerDay',
                          parseInt(event.target.value, 10) || 1,
                        )
                      }
                      className="w-24 rounded border px-2 py-1"
                      min="1"
                      max="10"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="複数枠">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(hours.allowMultipleSlots)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSettings((prev) => {
                            const updated = [...prev.businessHours]
                            const current = { ...updated[index], allowMultipleSlots: checked }
                            if (checked && (!current.slotInterval || current.slotInterval <= 0)) {
                              current.slotInterval = 30
                            }
                            if (!checked) {
                              delete current.slotInterval
                            }
                            updated[index] = current
                            return { ...prev, businessHours: updated }
                          })
                        }}
                        className="h-4 w-4"
                        disabled={!hours.isOpen}
                      />
                      複数枠を許可
                    </label>
                    <p className="mt-1 text-xs text-gray-500 text-left">
                      チェックすると指定間隔で連続枠を作成します
                    </p>
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="枠間隔（分）">
                    <input
                      type="number"
                      value={hours.slotInterval ?? 30}
                      onChange={(event) =>
                        handleBusinessHoursChange(
                          index,
                          'slotInterval',
                          Math.max(5, parseInt(event.target.value, 10) || 30),
                        )
                      }
                      className="w-24 rounded border px-2 py-1"
                      min="5"
                      step="5"
                      disabled={!hours.isOpen || !hours.allowMultipleSlots}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      初期値 30 分。複数枠が有効のときのみ適用されます。
                    </p>
                  </td>
                  <td className="px-4 py-2 text-sm" data-label="開始可能時刻（カンマ区切り）">
                    <input
                      type="text"
                      value={(hours.allowedSlots ?? []).join(', ')}
                      onChange={(event) =>
                        handleBusinessHoursChange(
                          index,
                          'allowedSlots',
                          parseSlotsInput(event.target.value),
                        )
                      }
                      className="w-full rounded border px-2 py-1"
                      placeholder="例: 18:00,19:00"
                      disabled={!hours.isOpen}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!hours.isOpen}
                        onClick={() => {
                          const intervalMinutes = hours.allowMultipleSlots
                            ? (hours.slotInterval ?? 30)
                            : settings.slotDuration
                          const openMin = toMinutes(hours.open)
                          const closeMin = toMinutes(hours.close)
                          if (openMin === null || closeMin === null) {
                            notify('error', '開始/終了時間の形式が正しくありません。')
                            return
                          }

                          const slotDuration = settings.slotDuration
                          const lastStart = closeMin - slotDuration
                          let effectiveClose = hours.close

                          if (lastStart < openMin) {
                            const ok = window.confirm(
                              `終了時間（close）が所要時間（${slotDuration}分）より短いため枠を生成できません。\n` +
                                `最終受付運用の場合は、close を「施術終了」まで自動補正（close=最終受付+${slotDuration}分）してから枠を生成します。\n` +
                                `このまま補正して続行しますか？`,
                            )
                            if (!ok) return

                            const extendedCloseMin = closeMin + slotDuration
                            if (extendedCloseMin >= 24 * 60) {
                              notify(
                                'error',
                                `所要時間（${slotDuration}分）を足すと日付をまたぐため、自動補正できません。終了時間を手動で調整してください。`,
                              )
                              return
                            }
                            effectiveClose = toTime(extendedCloseMin)
                            handleBusinessHoursChange(index, 'close', effectiveClose)
                          }

                          const slots = buildStartSlots(
                            hours.open,
                            effectiveClose,
                            settings.slotDuration,
                            intervalMinutes,
                          )
                          if (slots.length === 0) {
                            notify(
                              'error',
                              '開始可能時刻を自動生成できませんでした。終了時間（close）と所要時間、枠間隔を見直してください。',
                            )
                            return
                          }
                          handleBusinessHoursChange(index, 'allowedSlots', slots)
                          notify('success', `開始可能時刻を ${slots.length} 件生成しました。`)
                        }}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
                      >
                        枠を自動生成
                      </button>
                      <button
                        type="button"
                        disabled={!hours.isOpen}
                        onClick={() => handleBusinessHoursChange(index, 'allowedSlots', [])}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
                      >
                        クリア
                      </button>
                      <span className="text-xs text-gray-600">
                        最終受付（自動）:{' '}
                        {(() => {
                          const openMin = toMinutes(hours.open)
                          const closeMin = toMinutes(hours.close)
                          if (openMin === null || closeMin === null) return '-'
                          const lastStart = closeMin - settings.slotDuration
                          if (lastStart < openMin) return '（設定不整合）'
                          return toTime(lastStart)
                        })()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      入力するとその開始時刻のみ枠が表示されます。未入力なら open〜close をもとに自動生成します。
                    </p>
                  </td>
                </tr>
              ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('blockedDates')}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left hover:bg-gray-50"
          aria-expanded={openSections.blockedDates}
        >
          <div>
            <h2 className="text-xl font-semibold">ブロック日設定</h2>
            <p className="mt-1 text-sm text-gray-600">特定日を予約不可にする</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {openSections.blockedDates ? '閉じる' : '開く'}
          </span>
        </button>

        {openSections.blockedDates && (
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(event) => setNewBlockedDate(event.target.value)}
                  className="flex-1 rounded border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                現在のブロック日:{' '}
                <span className="font-semibold">{settings.blockedDates?.length ?? 0}</span> 件
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClearBlockedDatesAll}
                  disabled={saving}
                  className="rounded-md bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  ブロック日を全クリア
                </button>
                <button
                  type="button"
                  onClick={handleResetSettingsToDefault}
                  disabled={saving}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  設定を初期化
                </button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {(settings.blockedDates || []).map((date) => (
                <li key={date} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span>{date}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlockedDate(date)}
                    className="text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </li>
              ))}

              {(!settings.blockedDates || settings.blockedDates.length === 0) && (
                <li className="text-sm text-gray-500">現在、ブロック日は設定されていません。</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('dateOverrides')}
          className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left hover:bg-gray-50"
          aria-expanded={openSections.dateOverrides}
        >
          <div>
            <h2 className="text-xl font-semibold">日付別の開始可能時刻設定</h2>
            <p className="mt-1 text-sm text-gray-600">特定の日だけ開始可能時刻を上書き</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {openSections.dateOverrides ? '閉じる' : '開く'}
          </span>
        </button>

        {openSections.dateOverrides && (
          <div className="px-6 pb-6">
            <p className="mb-4 text-sm text-gray-600">
              特定の日のみ開始可能時刻を変更したい場合に追加してください。時間はカンマ区切りで入力します。
            </p>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="date"
                  value={newOverrideDate}
                  onChange={(event) => setNewOverrideDate(event.target.value)}
                  className="flex-1 rounded border px-3 py-2"
                />
                <input
                  type="text"
                  value={newOverrideSlots}
                  onChange={(event) => setNewOverrideSlots(event.target.value)}
                  className="flex-1 rounded border px-3 py-2"
                  placeholder="例: 09:00,12:00,15:00"
                />
                <button
                  type="button"
                  onClick={handleAddDateOverride}
                  className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                現在の設定:{' '}
                <span className="font-semibold">{Object.keys(settings.dateOverrides ?? {}).length}</span> 件
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClearDateOverridesAll}
                  disabled={saving}
                  className="rounded-md bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  全クリア
                </button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {Object.entries(settings.dateOverrides ?? {}).length === 0 && (
                <li className="text-sm text-gray-500">設定されている日付はありません。</li>
              )}
              {Object.entries(settings.dateOverrides ?? {}).map(([date, override]) => (
                <li key={date} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{date}</p>
                    <p className="text-gray-600">
                      {(override.allowedSlots ?? []).length > 0
                        ? `開始可能時刻: ${(override.allowedSlots ?? []).join(', ')}`
                        : 'この日の開始可能時刻設定はありません'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDateOverride(date)}
                    className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving || isFallbackData}
          className="rounded-md bg-primary px-6 py-2 text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? '保存中…' : '設定を保存'}
        </button>
      </div>
    </div>
  )
}
