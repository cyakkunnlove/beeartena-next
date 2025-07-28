'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiClient } from '@/lib/api/client';
import { reservationService } from '@/lib/firebase/reservations';
import Calendar from '@/components/reservation/Calendar';
import TimeSlots from '@/components/reservation/TimeSlots';
import ServiceSelection from '@/components/reservation/ServiceSelection';
import ReservationForm from '@/components/reservation/ReservationForm';
import BusinessHoursInfo from '@/components/reservation/BusinessHoursInfo';
import { motion, AnimatePresence } from 'framer-motion';
import { reservationStorage } from '@/lib/utils/reservationStorage';

export default function ReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    // 会員登録から戻ってきた場合、保存された予約情報を復元
    const fromRegister = searchParams.get('from') === 'register';
    const savedReservation = reservationStorage.get();
    
    if (fromRegister && savedReservation) {
      setSelectedService(savedReservation.serviceId);
      setSelectedDate(savedReservation.date);
      setSelectedTime(savedReservation.time);
      setFormData(savedReservation.formData);
      // 最後のステップに移動
      setStep(4);
      // 復元後は削除
      reservationStorage.clear();
    } else if (user) {
      // If user is logged in, prefill form
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        notes: '',
      });
    }
  }, [user, searchParams]);

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

  const serviceData = {
    '2D': { name: 'パウダーブロウ', price: 20000 },
    '3D': { name: 'フェザーブロウ', price: 20000 },
    '4D': { name: 'パウダー&フェザー', price: 25000 },
  };

  const getServicePrice = () => {
    const service = serviceData[selectedService as keyof typeof serviceData];
    return service?.price || 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // 未ログインユーザーの場合、予約情報を保存して会員登録へ
    if (!user) {
      const service = serviceData[selectedService as keyof typeof serviceData];
      
      // 予約情報を保存
      reservationStorage.save({
        serviceId: selectedService,
        serviceName: service.name,
        date: selectedDate,
        time: selectedTime,
        formData: formData,
      });
      
      // 会員登録ページへリダイレクト
      router.push('/register?reservation=true');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const service = serviceData[selectedService as keyof typeof serviceData];
      const finalPrice = service.price - pointsToUse;

      const reservationData = {
        serviceType: selectedService as '2D' | '3D' | '4D',
        serviceName: service.name,
        price: service.price,
        date: new Date(selectedDate),
        time: selectedTime,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        customerId: user?.id || null,
        notes: formData.notes,
        finalPrice: finalPrice,
        pointsUsed: pointsToUse,
      };

      // Firebaseに直接保存
      await reservationService.createReservation(reservationData);

      // ポイント使用の記録
      if (user && pointsToUse > 0) {
        const updatedUser = { ...user, points: (user.points || 0) - pointsToUse };
        localStorage.setItem('users', JSON.stringify(
          JSON.parse(localStorage.getItem('users') || '[]').map((u: any) =>
            u.id === user.id ? updatedUser : u
          )
        ));

        // ポイント履歴に記録
        const pointTransaction = {
          id: Date.now().toString(),
          userId: user.id,
          amount: -pointsToUse,
          type: 'redeemed',
          reason: `${service.name}の予約に使用`,
          createdAt: new Date().toISOString(),
        };
        const points = JSON.parse(localStorage.getItem('points') || '[]');
        points.push(pointTransaction);
        localStorage.setItem('points', JSON.stringify(points));
      }

      // Show success and redirect
      alert('予約が完了しました。確認メールをお送りします。');
      
      if (user) {
        router.push('/mypage/reservations');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      alert(error.message || '予約に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const stepTransition = {
    type: 'spring' as const,
    stiffness: 260,
    damping: 20,
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="text-2xl font-semibold mb-6">1. メニューを選択</h2>
            <ServiceSelection onSelect={handleServiceSelect} selected={selectedService} />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="text-2xl font-semibold mb-6">2. 日付を選択</h2>
            <Calendar onSelect={handleDateSelect} selected={selectedDate} />
            <motion.button
              onClick={() => setStep(1)}
              className="mt-4 text-primary hover:text-dark-gold"
              whileTap={{ scale: 0.95 }}
            >
              ← メニュー選択に戻る
            </motion.button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step3"
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="text-2xl font-semibold mb-6">3. 時間を選択</h2>
            <TimeSlots
              date={selectedDate}
              onSelect={handleTimeSelect}
              selected={selectedTime}
            />
            <motion.button
              onClick={() => setStep(2)}
              className="mt-4 text-primary hover:text-dark-gold"
              whileTap={{ scale: 0.95 }}
            >
              ← 日付選択に戻る
            </motion.button>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            key="step4"
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="text-2xl font-semibold mb-6">4. お客様情報を入力</h2>
            <ReservationForm
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              isLoggedIn={!!user}
              servicePrice={getServicePrice()}
              onPointsUsed={setPointsToUse}
            />
            <motion.button
              onClick={() => setStep(3)}
              className="mt-4 text-primary hover:text-dark-gold"
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
            >
              ← 時間選択に戻る
            </motion.button>
          </motion.div>
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
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-300 ${
                    step >= num
                      ? 'bg-primary text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                  animate={{
                    scale: step === num ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {num}
                </motion.div>
                {num < 4 && (
                  <motion.div
                    className={`flex-1 h-1 mx-2 ${
                      step > num ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step > num ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    style={{ originX: 0 }}
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

        {/* Business Hours Info */}
        <div className="max-w-3xl mx-auto mb-6">
          <BusinessHoursInfo />
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
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
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