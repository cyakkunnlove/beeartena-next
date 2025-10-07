'use client'

import { useState, useEffect } from 'react'

import { TimeSlot } from '@/lib/types'

interface TimeSlotsProps {
  date: string
  onSelect: (time: string) => void
  selected: string
}

export default function TimeSlots({ date, onSelect, selected }: TimeSlotsProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  // 日付文字列をローカルタイムで解釈
  const [year, month, day] = date.split('-').map(Number)
  const selectedDate = new Date(year, month - 1, day)
  const isValidSelectedDate = !Number.isNaN(selectedDate.getTime())

  useEffect(() => {
    if (!date) {
      setTimeSlots([])
      setLoading(false)
      setError('日付が選択されていません。')
      return
    }

    let isCancelled = false
    const controller = new AbortController()
    const timeoutReason = 'timeout'
    const timeoutId = setTimeout(() => {
      controller.abort(timeoutReason)
    }, 10000)

    const fetchTimeSlots = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/reservations/by-date?date=${date}&reload=${reloadCount}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch time slots')
        }

        const data = await response.json()
        if (isCancelled) return
        setTimeSlots(data.timeSlots || [])
      } catch (err: any) {
        if (isCancelled) return

        if (err?.name === 'AbortError') {
          if (controller.signal.reason === timeoutReason) {
            console.warn('時間枠取得がタイムアウトしました', err)
            setError('時間枠の読み込みに時間がかかっています。再読み込みしてください。')
            setTimeSlots([])
          } else {
            // React StrictMode のダブルマウントによる中断はエラー表示にしない
            console.debug('時間枠取得はコンポーネント再評価のため中断されました')
          }
        } else {
          console.error('時間枠の取得に失敗しました:', err)
          setError('時間枠の取得に失敗しました。もう一度お試しください。')
          setTimeSlots([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
        clearTimeout(timeoutId)
      }
    }

    fetchTimeSlots()

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      controller.abort()
      setLoading(false)
    }
  }, [date, reloadCount])

  const handleRetry = () => {
    setReloadCount((count) => count + 1)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 p-4 bg-light-accent rounded-lg">
        <p className="text-sm text-gray-600">
          選択日:{' '}
          {isValidSelectedDate
            ? selectedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })
            : '日付が選択されていません'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 inline-flex items-center justify-center rounded-md border border-red-400 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            再読み込み
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {timeSlots.map((slot) => (
          <button
            key={slot.time}
            onClick={() => slot.available && onSelect(slot.time)}
            disabled={!slot.available}
            className={`
              py-3 px-4 rounded-lg text-sm font-medium transition-all
              ${
                selected === slot.time
                  ? 'bg-primary text-white'
                  : slot.available
                    ? 'bg-white border-2 border-gray-200 hover:border-primary'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {slot.time}
          </button>
        ))}
      </div>

      {timeSlots.filter((s) => s.available).length === 0 && (
        <p className="text-center text-gray-600 mt-8">
          申し訳ございません。この日は予約が満席です。
          <br />
          別の日付をお選びください。
        </p>
      )}
    </div>
  )
}
