'use client'

import { TrashIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import SlideTransition from '@/components/layout/SlideTransition'
import { useAuth } from '@/lib/auth/AuthContext'
import { reservationService } from '@/lib/reservationService'
import { BusinessHours, ReservationSettings } from '@/lib/types'

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
]

export default function AdminSettings() {
  const router = useRouter()
  const { user } = useAuth()
  const [settings, setSettings] = useState<ReservationSettings | null>(null)
  const [blockedDate, setBlockedDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 定休日設定
  const [regularClosedDays, setRegularClosedDays] = useState<number[]>([])

  // 期間休業設定
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  // カレンダー表示
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    // Load current settings
    const currentSettings = reservationService.getSettings()
    setSettings(currentSettings)

    // 定休日を営業時間から抽出
    const closedDays = currentSettings.businessHours
      .filter((h) => !h.isOpen)
      .map((h) => h.dayOfWeek)
    setRegularClosedDays(closedDays)
  }, [user, router])

  const handleBusinessHoursChange = (
    dayOfWeek: number,
    field: keyof BusinessHours,
    value: string | boolean,
  ) => {
    if (!settings) return

    const updatedHours = [...settings.businessHours]
    updatedHours[dayOfWeek] = {
      ...updatedHours[dayOfWeek],
      [field]: value,
    }

    setSettings({
      ...settings,
      businessHours: updatedHours,
    })
  }

  const handleSlotSettingsChange = (field: keyof ReservationSettings, value: number) => {
    if (!settings) return

    setSettings({
      ...settings,
      [field]: value,
    })
  }

  const handleAddBlockedDate = () => {
    if (!settings || !blockedDate) return

    const updatedBlockedDates = [...(settings.blockedDates || [])]
    if (!updatedBlockedDates.includes(blockedDate)) {
      updatedBlockedDates.push(blockedDate)
      updatedBlockedDates.sort()

      setSettings({
        ...settings,
        blockedDates: updatedBlockedDates,
      })
    }

    setBlockedDate('')
  }

  const handleRemoveBlockedDate = (date: string) => {
    if (!settings) return

    const updatedBlockedDates = (settings.blockedDates || []).filter((d) => d !== date)

    setSettings({
      ...settings,
      blockedDates: updatedBlockedDates,
    })
  }

  // 定休日の一括設定
  const handleRegularClosedDaysChange = (dayOfWeek: number) => {
    if (!settings) return

    const updatedClosedDays = regularClosedDays.includes(dayOfWeek)
      ? regularClosedDays.filter((d) => d !== dayOfWeek)
      : [...regularClosedDays, dayOfWeek]

    setRegularClosedDays(updatedClosedDays)

    // 営業時間も更新
    const updatedHours = [...settings.businessHours]
    updatedHours[dayOfWeek] = {
      ...updatedHours[dayOfWeek],
      isOpen: !updatedClosedDays.includes(dayOfWeek),
    }

    setSettings({
      ...settings,
      businessHours: updatedHours,
    })
  }

  // 期間での休業日設定
  const handlePeriodClosedDates = () => {
    if (!settings || !periodStart || !periodEnd) return

    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    const updatedBlockedDates = [...(settings.blockedDates || [])]

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (!updatedBlockedDates.includes(dateStr)) {
        updatedBlockedDates.push(dateStr)
      }
    }

    updatedBlockedDates.sort()
    setSettings({
      ...settings,
      blockedDates: updatedBlockedDates,
    })

    setPeriodStart('')
    setPeriodEnd('')
  }

  // 特定月の定休日を一括設定
  const applyRegularClosedDaysToMonth = (year: number, month: number) => {
    if (!settings || regularClosedDays.length === 0) return

    const updatedBlockedDates = [...(settings.blockedDates || [])]
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()

      if (regularClosedDays.includes(dayOfWeek)) {
        const dateStr = date.toISOString().split('T')[0]
        if (!updatedBlockedDates.includes(dateStr)) {
          updatedBlockedDates.push(dateStr)
        }
      }
    }

    updatedBlockedDates.sort()
    setSettings({
      ...settings,
      blockedDates: updatedBlockedDates,
    })
  }

  const handleSave = () => {
    if (!settings) return

    setIsSaving(true)
    reservationService.saveSettings(settings)

    setTimeout(() => {
      setIsSaving(false)
      alert('設定を保存しました')
    }, 500)
  }

  // カレンダー表示用のヘルパー関数
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // 前月の日付で埋める
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const isBlockedDate = (date: Date | null) => {
    if (!date || !settings) return false
    const dateStr = date.toISOString().split('T')[0]
    return settings.blockedDates?.includes(dateStr) || false
  }

  const isRegularClosedDay = (date: Date | null) => {
    if (!date) return false
    return regularClosedDays.includes(date.getDay())
  }

  if (!user || user.role !== 'admin' || !settings) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">予約設定</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-primary hover:text-dark-gold"
            >
              ← 管理画面に戻る
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 基本設定 */}
          <SlideTransition>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">基本設定</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="slot-duration"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    1予約あたりの時間（分）
                  </label>
                  <input
                    id="slot-duration"
                    type="number"
                    value={settings.slotDuration}
                    onChange={(e) =>
                      handleSlotSettingsChange('slotDuration', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    min="30"
                    step="30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="max-capacity"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    1時間枠あたりの最大予約数
                  </label>
                  <input
                    id="max-capacity"
                    type="number"
                    value={settings.maxCapacityPerSlot}
                    onChange={(e) =>
                      handleSlotSettingsChange('maxCapacityPerSlot', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </SlideTransition>

          {/* 定休日設定 */}
          <SlideTransition delay={0.1}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">定休日設定</h2>
              <p className="text-sm text-gray-600 mb-4">
                毎週の定休日を設定します。選択した曜日は自動的に休業日となります。
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      regularClosedDays.includes(day.value)
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={regularClosedDays.includes(day.value)}
                      onChange={() => handleRegularClosedDaysChange(day.value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </SlideTransition>

          {/* 営業時間設定 */}
          <SlideTransition delay={0.2}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">営業時間詳細</h2>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const hours = settings.businessHours[day.value]
                  return (
                    <motion.div
                      key={day.value}
                      className={`flex items-center gap-4 p-4 border rounded-lg ${
                        !hours.isOpen ? 'bg-gray-50' : ''
                      }`}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-24">
                        <span className="font-medium">{day.label}</span>
                      </div>

                      {hours.isOpen ? (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) =>
                              handleBusinessHoursChange(day.value, 'open', e.target.value)
                            }
                            className="px-3 py-1 border rounded"
                          />
                          <span>〜</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) =>
                              handleBusinessHoursChange(day.value, 'close', e.target.value)
                            }
                            className="px-3 py-1 border rounded"
                          />
                        </>
                      ) : (
                        <span className="text-red-600 font-medium">定休日</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </SlideTransition>

          {/* 休業日設定 */}
          <SlideTransition delay={0.3}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">特別休業日設定</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 個別日付設定 */}
                <div>
                  <h3 className="font-medium mb-3">個別の休業日</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="date"
                      value={blockedDate}
                      onChange={(e) => setBlockedDate(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <motion.button
                      onClick={handleAddBlockedDate}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
                      whileTap={{ scale: 0.95 }}
                      disabled={!blockedDate}
                    >
                      追加
                    </motion.button>
                  </div>

                  {/* 期間設定 */}
                  <h3 className="font-medium mb-3">期間での休業日設定</h3>
                  <div className="space-y-2 mb-4">
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="開始日"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="終了日"
                      min={periodStart || new Date().toISOString().split('T')[0]}
                    />
                    <motion.button
                      onClick={handlePeriodClosedDates}
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
                      whileTap={{ scale: 0.95 }}
                      disabled={!periodStart || !periodEnd}
                    >
                      期間を休業日に設定
                    </motion.button>
                  </div>

                  {/* 定休日の月間適用 */}
                  <h3 className="font-medium mb-3">定休日を特定月に適用</h3>
                  <div className="flex gap-2">
                    <input
                      type="month"
                      value={`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`}
                      onChange={(e) => {
                        const [year, month] = e.target.value.split('-')
                        setCalendarMonth(new Date(parseInt(year), parseInt(month) - 1))
                      }}
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <motion.button
                      onClick={() =>
                        applyRegularClosedDaysToMonth(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth(),
                        )
                      }
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
                      whileTap={{ scale: 0.95 }}
                      disabled={regularClosedDays.length === 0}
                    >
                      適用
                    </motion.button>
                  </div>
                </div>

                {/* カレンダー表示 */}
                <div>
                  <h3 className="font-medium mb-3">休業日カレンダー</h3>
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() =>
                          setCalendarMonth(
                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1),
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        ←
                      </button>
                      <h4 className="font-medium">
                        {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
                      </h4>
                      <button
                        onClick={() =>
                          setCalendarMonth(
                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        →
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                        <div key={day} className="font-medium py-1">
                          {day}
                        </div>
                      ))}
                      {getDaysInMonth(calendarMonth).map((date, index) => (
                        <div
                          key={index}
                          className={`py-1 text-xs ${
                            date
                              ? isBlockedDate(date)
                                ? 'bg-red-100 text-red-700 font-medium'
                                : isRegularClosedDay(date)
                                  ? 'bg-gray-100 text-gray-500'
                                  : ''
                              : ''
                          }`}
                        >
                          {date?.getDate() || ''}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-300"></div>
                        <span>特別休業日</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
                        <span>定休日</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 設定済みの休業日リスト */}
              {settings.blockedDates && settings.blockedDates.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-700 mb-3">設定済みの特別休業日</h3>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {settings.blockedDates.map((date) => (
                        <motion.div
                          key={date}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <span>{new Date(date + 'T00:00:00').toLocaleDateString('ja-JP')}</span>
                          <button
                            onClick={() => handleRemoveBlockedDate(date)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SlideTransition>

          {/* 保存ボタン */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={handleSave}
              className={`px-8 py-3 rounded-lg font-medium text-white ${
                isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-dark-gold'
              }`}
              whileTap={{ scale: 0.95 }}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '設定を保存'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
