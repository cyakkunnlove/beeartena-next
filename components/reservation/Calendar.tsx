'use client';

import { useState, useEffect } from 'react';
import { reservationService } from '@/lib/reservationService';

interface CalendarProps {
  onSelect: (date: string) => void;
  selected: string;
}

export default function Calendar({ onSelect, selected }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthAvailability, setMonthAvailability] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    // Get actual availability for the current month
    const availability = reservationService.getMonthAvailability(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    setMonthAvailability(availability);
  }, [currentMonth]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty days for the beginning of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = formatDate(date);
    return monthAvailability.get(dateStr) || false;
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
          disabled={currentMonth.getMonth() === new Date().getMonth()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold">{monthYear}</h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = formatDate(day);
          const isAvailable = isDateAvailable(day);
          const isPast = isDatePast(day);
          const isSelected = selected === dateStr;
          const isSunday = day.getDay() === 0;

          return (
            <button
              key={dateStr}
              onClick={() => isAvailable && onSelect(dateStr)}
              disabled={!isAvailable || isPast}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all relative
                ${isSelected
                  ? 'bg-primary text-white'
                  : isAvailable && !isPast
                  ? 'bg-white hover:bg-primary/10 border border-gray-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
                ${isSunday ? 'text-red-500' : ''}
              `}
              title={!isAvailable && !isPast && !isSunday ? '満員' : ''}
            >
              {day.getDate()}
              {!isAvailable && !isPast && !isSunday && (
                <span className="absolute top-1 right-1 text-xs text-red-500">●</span>
              )}
            </button>
          );
        })}
      </div>

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
  );
}