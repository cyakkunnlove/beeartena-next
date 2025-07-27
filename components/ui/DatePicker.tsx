'use client';

import { useState, useEffect } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
}

export default function DatePicker({ value, onChange, required = false }: DatePickerProps) {
  const today = new Date();
  const defaultDate = new Date(today.getFullYear() - 35, today.getMonth(), today.getDate());
  
  const [year, setYear] = useState(value ? parseInt(value.split('-')[0]) : defaultDate.getFullYear());
  const [month, setMonth] = useState(value ? parseInt(value.split('-')[1]) : defaultDate.getMonth() + 1);
  const [day, setDay] = useState(value ? parseInt(value.split('-')[2]) : defaultDate.getDate());

  // 年の範囲（100年前から今年まで）
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  
  // 月の範囲
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // 日の範囲（月に応じて動的に変更）
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  useEffect(() => {
    // 月が変わったときに日が範囲外の場合は調整
    const maxDay = getDaysInMonth(year, month);
    if (day > maxDay) {
      setDay(maxDay);
    }
    
    // 値を更新
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onChange(`${year}-${formattedMonth}-${formattedDay}`);
  }, [year, month, day]);

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">年</label>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          required={required}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">月</label>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          required={required}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">日</label>
        <select
          value={day}
          onChange={(e) => setDay(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          required={required}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}日
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}