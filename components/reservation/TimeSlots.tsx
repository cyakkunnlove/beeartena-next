'use client'

import { useState, useEffect } from 'react'

import { reservationService } from '@/lib/reservationService'
import { TimeSlot } from '@/lib/types'

interface TimeSlotsProps {
  date: string
  onSelect: (time: string) => void
  selected: string
}

export default function TimeSlots({ date, onSelect, selected }: TimeSlotsProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  // 日付文字列をローカルタイムで解釈
  const [year, month, day] = date.split('-').map(Number)
  const selectedDate = new Date(year, month - 1, day)

  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setLoading(true)
        const slots = await reservationService.getTimeSlotsForDate(date)
        setTimeSlots(slots)
      } catch (error) {
        console.error('時間枠の取得に失敗しました:', error)
        setTimeSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchTimeSlots()
  }, [date])

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
          {selectedDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

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
