'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { storageService } from '@/lib/storage/storageService';
import Calendar from '@/components/reservation/Calendar';
import TimeSlots from '@/components/reservation/TimeSlots';
import ServiceSelection from '@/components/reservation/ServiceSelection';
import ReservationForm from '@/components/reservation/ReservationForm';

export default function ReservationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    // If user is logged in, prefill form
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        notes: '',
      });
    }
  }, [user]);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(3);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const serviceData = {
        '2D': { name: 'パウダーブロウ', price: 20000 },
        '3D': { name: 'フェザーブロウ', price: 20000 },
        '4D': { name: 'パウダー&フェザー', price: 25000 },
      };

      const service = serviceData[selectedService as keyof typeof serviceData];

      const reservation = {
        customerId: user?.id || 'guest',
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        serviceType: selectedService as any,
        serviceName: service.name,
        price: service.price,
        date: selectedDate,
        time: selectedTime,
        status: 'pending' as const,
        notes: formData.notes,
      };

      storageService.createReservation(reservation);

      // Show success and redirect
      alert('予約が完了しました。確認メールをお送りします。');
      
      if (user) {
        router.push('/mypage/reservations');
      } else {
        router.push('/');
      }
    } catch (error) {
      alert('予約に失敗しました。もう一度お試しください。');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6">1. メニューを選択</h2>
            <ServiceSelection onSelect={handleServiceSelect} selected={selectedService} />
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6">2. 日付を選択</h2>
            <Calendar onSelect={handleDateSelect} selected={selectedDate} />
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-primary hover:text-dark-gold"
            >
              ← メニュー選択に戻る
            </button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6">3. 時間を選択</h2>
            <TimeSlots
              date={selectedDate}
              onSelect={handleTimeSelect}
              selected={selectedTime}
            />
            <button
              onClick={() => setStep(2)}
              className="mt-4 text-primary hover:text-dark-gold"
            >
              ← 日付選択に戻る
            </button>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6">4. お客様情報を入力</h2>
            <ReservationForm
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              isLoggedIn={!!user}
            />
            <button
              onClick={() => setStep(3)}
              className="mt-4 text-primary hover:text-dark-gold"
            >
              ← 時間選択に戻る
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gradient">
          オンライン予約
        </h1>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`flex items-center ${num < 4 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= num
                      ? 'bg-primary text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {num}
                </div>
                {num < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > num ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">メニュー</span>
            <span className="text-xs text-gray-600">日付</span>
            <span className="text-xs text-gray-600">時間</span>
            <span className="text-xs text-gray-600">情報入力</span>
          </div>
        </div>

        {/* Reservation Summary */}
        {(selectedService || selectedDate || selectedTime) && (
          <div className="max-w-3xl mx-auto mb-8 bg-light-accent rounded-lg p-4">
            <h3 className="font-semibold mb-2">予約内容</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {selectedService && (
                <div>
                  <span className="text-gray-600">メニュー:</span>
                  <span className="ml-2 font-medium">{selectedService}</span>
                </div>
              )}
              {selectedDate && (
                <div>
                  <span className="text-gray-600">日付:</span>
                  <span className="ml-2 font-medium">
                    {new Date(selectedDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
              {selectedTime && (
                <div>
                  <span className="text-gray-600">時間:</span>
                  <span className="ml-2 font-medium">{selectedTime}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          {renderStep()}
        </div>

        {/* Info */}
        <div className="max-w-3xl mx-auto mt-8 text-center text-gray-600">
          <p>ご不明な点がございましたら、お気軽にお問い合わせください</p>
          <div className="flex justify-center gap-4 mt-4">
            <a
              href="tel:090-5278-5221"
              className="text-primary hover:text-dark-gold"
            >
              📞 090-5278-5221
            </a>
            <a
              href="https://line.me/R/ti/p/@174geemy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-dark-gold"
            >
              💬 LINE
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}