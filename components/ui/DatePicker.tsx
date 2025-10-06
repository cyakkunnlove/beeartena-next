'use client'

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  required?: boolean
}

const formatDate = (date: Date) => date.toISOString().split('T')[0]

export default function DatePicker({ value, onChange, required = false }: DatePickerProps) {
  const today = useMemo(() => new Date(), [])
  const maxDate = useMemo(() => formatDate(today), [today])
  const minDate = useMemo(() => {
    const min = new Date(today)
    min.setFullYear(min.getFullYear() - 100)
    return formatDate(min)
  }, [today])

  const [internalValue, setInternalValue] = useState<string>(value || '')

  useEffect(() => {
    setInternalValue(value || '')
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    setInternalValue(nextValue)
    onChange(nextValue)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange('')
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={internalValue}
        onChange={handleChange}
        max={maxDate}
        min={minDate}
        required={required}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {!required && internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          クリア
        </button>
      )}
    </div>
  )
}
