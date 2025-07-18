'use client';

import { reservationService } from '@/lib/reservationService';

interface TimeSlotsProps {
  date: string;
  onSelect: (time: string) => void;
  selected: string;
}

export default function TimeSlots({ date, onSelect, selected }: TimeSlotsProps) {
  const selectedDate = new Date(date);
  
  // Get actual time slots from reservation service
  const timeSlots = reservationService.getTimeSlotsForDate(date);

  return (
    <div>
      <div className="mb-4 p-4 bg-light-accent rounded-lg">
        <p className="text-sm text-gray-600">
          選択日: {selectedDate.toLocaleDateString('ja-JP', {
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
              ${selected === slot.time
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

      {timeSlots.filter(s => s.available).length === 0 && (
        <p className="text-center text-gray-600 mt-8">
          申し訳ございません。この日は予約が満席です。<br />
          別の日付をお選びください。
        </p>
      )}
    </div>
  );
}