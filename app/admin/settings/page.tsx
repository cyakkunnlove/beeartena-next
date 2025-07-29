'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { reservationService } from '@/lib/reservationService'
import { ReservationSettings, BusinessHours } from '@/lib/types'

const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [settings, setSettings] = useState<ReservationSettings>({
    slotDuration: 120,
    maxCapacityPerSlot: 1,
    businessHours: [],
    blockedDates: [],
  })
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    // 設定を読み込む
    const loadedSettings = reservationService.getSettings()
    setSettings(loadedSettings)
    setIsLoading(false)
  }, [user, router])

  const handleBusinessHoursChange = (
    dayIndex: number,
    field: keyof BusinessHours,
    value: string | boolean
  ) => {
    const updatedHours = [...settings.businessHours]
    updatedHours[dayIndex] = {
      ...updatedHours[dayIndex],
      [field]: value,
    }
    setSettings({ ...settings, businessHours: updatedHours })
  }

  const handleSaveSettings = () => {
    reservationService.saveSettings(settings)
    setMessage('設定を保存しました')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !settings.blockedDates?.includes(newBlockedDate)) {
      setSettings({
        ...settings,
        blockedDates: [...(settings.blockedDates || []), newBlockedDate],
      })
      setNewBlockedDate('')
    }
  }

  const handleRemoveBlockedDate = (date: string) => {
    setSettings({
      ...settings,
      blockedDates: settings.blockedDates?.filter((d) => d !== date) || [],
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">予約システム設定</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">基本設定</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              予約枠の長さ（分）
            </label>
            <input
              type="number"
              value={settings.slotDuration}
              onChange={(e) => setSettings({ ...settings, slotDuration: parseInt(e.target.value) || 120 })}
              className="w-full border rounded-lg px-3 py-2"
              min="30"
              step="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1枠あたりの最大予約数
            </label>
            <input
              type="number"
              value={settings.maxCapacityPerSlot}
              onChange={(e) => setSettings({ ...settings, maxCapacityPerSlot: parseInt(e.target.value) || 1 })}
              className="w-full border rounded-lg px-3 py-2"
              min="1"
              max="5"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">営業時間設定</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">曜日</th>
                <th className="text-left py-2 px-4">営業</th>
                <th className="text-left py-2 px-4">開店時間</th>
                <th className="text-left py-2 px-4">閉店時間</th>
              </tr>
            </thead>
            <tbody>
              {settings.businessHours.map((hours, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-4">{daysOfWeek[index]}</td>
                  <td className="py-2 px-4">
                    <input
                      type="checkbox"
                      checked={hours.isOpen}
                      onChange={(e) => handleBusinessHoursChange(index, 'isOpen', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => handleBusinessHoursChange(index, 'open', e.target.value)}
                      disabled={!hours.isOpen}
                      className="border rounded px-2 py-1 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => handleBusinessHoursChange(index, 'close', e.target.value)}
                      disabled={!hours.isOpen}
                      className="border rounded px-2 py-1 disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">休業日設定</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            onClick={handleAddBlockedDate}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-dark-gold"
          >
            追加
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {settings.blockedDates?.map((date) => (
            <div
              key={date}
              className="bg-gray-100 rounded-lg px-3 py-2 flex justify-between items-center"
            >
              <span>{new Date(date + 'T00:00:00').toLocaleDateString('ja-JP')}</span>
              <button
                onClick={() => handleRemoveBlockedDate(date)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
        >
          設定を保存
        </button>
      </div>
    </div>
  )
}