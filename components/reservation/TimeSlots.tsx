interface TimeSlotsProps {
  date: string;
  onSelect: (time: string) => void;
  selected: string;
}

export default function TimeSlots({ date, onSelect, selected }: TimeSlotsProps) {
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();

  // Generate time slots based on business hours
  const getTimeSlots = () => {
    const slots: { time: string; available: boolean }[] = [];

    if (dayOfWeek === 3) {
      // Wednesday: 9:00-17:00
      for (let hour = 9; hour < 17; hour++) {
        slots.push({
          time: `${hour}:00`,
          available: Math.random() > 0.3, // Random availability for demo
        });
        if (hour < 16) {
          slots.push({
            time: `${hour}:30`,
            available: Math.random() > 0.3,
          });
        }
      }
    } else {
      // Other days: 18:30 or 19:30
      slots.push(
        { time: '18:30', available: Math.random() > 0.3 },
        { time: '19:30', available: Math.random() > 0.3 }
      );
    }

    return slots;
  };

  const timeSlots = getTimeSlots();

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