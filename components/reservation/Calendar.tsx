'use client'

import { useState, useEffect } from 'react'

interface CalendarProps {
  onSelect: (date: string) => void
  selected: string
  durationMinutes?: number
}

export default function Calendar({ onSelect, selected, durationMinutes }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthAvailability, setMonthAvailability] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null)

  useEffect(() => {
    // Get actual availability for the current month
    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1 // APIは1-based monthを期待
        const params = new URLSearchParams({
          year: String(year),
          month: String(month),
          mode: 'fast',
        })
        if (
          typeof durationMinutes === 'number' &&
          Number.isFinite(durationMinutes) &&
          durationMinutes > 0
        ) {
          params.set('durationMinutes', String(durationMinutes))
        }
        const response = await fetch(`/api/reservations/availability?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch availability')
        }

        const data = await response.json()
        setAvailabilityWarning(typeof data?.warning === 'string' ? data.warning : null)
        // data.availabilityが存在しない場合のフォールバック
        const availabilityData = data.availability || {}
        const availability = new Map<string, boolean>(Object.entries(availabilityData))
        setMonthAvailability(availability)
      } catch (error) {
        console.error('Failed to fetch availability:', error)
        // エラー時は空のMapを設定
        setMonthAvailability(new Map())
        setAvailabilityWarning(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAvailability()
  }, [currentMonth, durationMinutes])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty days for the beginning of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isDateAvailable = (date: Date) => {
    const dateStr = formatDate(date)
    return monthAvailability.get(dateStr) || false
  }

  const isDatePast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  })

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    const today = new Date()
    // 今月より前には戻れない
    if (newMonth.getFullYear() === today.getFullYear() && newMonth.getMonth() >= today.getMonth()) {
      setCurrentMonth(newMonth)
    } else if (newMonth.getFullYear() > today.getFullYear()) {
      setCurrentMonth(newMonth)
    }
  }

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 3) // 3ヶ月先まで

    // 3ヶ月先より後には進めない
    if (newMonth <= maxDate) {
      setCurrentMonth(newMonth)
    }
  }

  return (
    <div className="max-w-md mx-auto relative">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            currentMonth.getFullYear() === new Date().getFullYear() &&
            currentMonth.getMonth() === new Date().getMonth()
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold">{monthYear}</h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={(() => {
            const maxDate = new Date()
            maxDate.setMonth(maxDate.getMonth() + 3)
            return currentMonth.getFullYear() === maxDate.getFullYear() &&
                   currentMonth.getMonth() >= maxDate.getMonth()
          })()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {availabilityWarning && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {availabilityWarning}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateStr = formatDate(day)
          const isAvailable = isDateAvailable(day)
          const isPast = isDatePast(day)
          const isSelected = selected === dateStr
          const isSunday = day.getDay() === 0

          return (
            <button
              key={dateStr}
              onClick={() => isAvailable && onSelect(dateStr)}
              disabled={!isAvailable || isPast || isLoading}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all relative
                ${isLoading ? 'animate-pulse bg-gray-200' : ''}
                ${
                  !isLoading && isSelected
                    ? 'bg-primary text-white'
                    : !isLoading && isAvailable && !isPast
                      ? 'bg-white hover:bg-primary/10 border border-gray-200'
                      : !isLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : ''
                }
                ${isSunday && !isLoading ? 'text-red-500' : ''}
              `}
              title={!isAvailable && !isPast && !isSunday ? '満員' : ''}
            >
              {!isLoading && day.getDate()}
              {!isLoading && !isAvailable && !isPast && !isSunday && (
                <span className="absolute top-1 right-1 text-xs text-red-500">●</span>
              )}
            </button>
          )
        })}
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-gray-600">予約状況を確認中...</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span className="text-gray-600">予約可能</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded relative">
            <span className="absolute -top-1 -right-1 text-xs text-red-500">●</span>
          </div>
          <span className="text-gray-600">満員</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <span className="text-gray-600">予約不可</span>
        </div>
      </div>
    </div>
  )
}
