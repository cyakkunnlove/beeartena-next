'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

import BusinessHoursInfo from '@/components/reservation/BusinessHoursInfo'
import Calendar from '@/components/reservation/Calendar'
import MaintenanceOptions from '@/components/reservation/MaintenanceOptions'
import ReservationForm from '@/components/reservation/ReservationForm'
import ServiceSelection from '@/components/reservation/ServiceSelection'
import TimeSlots from '@/components/reservation/TimeSlots'
import { useAuth } from '@/lib/auth/AuthContext'
import { reservationStorage } from '@/lib/utils/reservationStorage'
import { ReservationFormData } from '@/lib/types'

function ReservationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedMaintenanceOptions, setSelectedMaintenanceOptions] = useState<string[]>([])
  const [maintenancePrice, setMaintenancePrice] = useState(0)
  const [_isSubmitting, setIsSubmitting] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [_shouldAutoSubmit, _setShouldAutoSubmit] = useState(false)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    phone: string
    notes: string
  }>({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [isMonitorPrice, setIsMonitorPrice] = useState(false)

  const serviceData: {
    [key: string]: {
      name: string
      price: number
      monitorPrice?: number
      otherShopPrice?: number
    }
  } = {
    '2D': { name: '2Dパウダーブロウ', price: 22000, monitorPrice: 20000, otherShopPrice: 35000 },
    '3D': { name: '3Dフェザーブロウ', price: 23000, monitorPrice: 20000, otherShopPrice: 35000 },
    '4D': { name: '4Dパウダー&フェザー', price: 25000, monitorPrice: 22000, otherShopPrice: 40000 },
    'wax': { name: '眉毛ワックス脱毛', price: 3000 },
    'retouch3': { name: '3ヶ月以内リタッチ', price: 11000 },
    'retouch6': { name: '半年以内リタッチ', price: 15000 },
  }

  // 会員登録から戻ってきた場合、保存した予約情報を復元
  useEffect(() => {
    if (searchParams.get('from') === 'register') {
      const savedReservation = reservationStorage.get()
      if (savedReservation) {
        setSelectedService(savedReservation.serviceId)
        setSelectedDate(savedReservation.date)
        setSelectedTime(savedReservation.time)
        setSelectedMaintenanceOptions(savedReservation.maintenanceOptions || [])
        setMaintenancePrice(savedReservation.maintenancePrice || 0)
        setFormData(savedReservation.formData)
        setStep(savedReservation.step || 5) // 保存されたステップまたは確認画面へ
        if (savedReservation.pointsToUse !== undefined) {
          setPointsToUse(savedReservation.pointsToUse)
        }

        // 予約確定ボタンを押していた場合は、自動的に予約処理を実行
        if (savedReservation.isReadyToSubmit && user) {
          reservationStorage.clear() // 先にクリア
          handleFormSubmit(savedReservation.formData)
        } else {
          // データ復元後はクリア
          reservationStorage.clear()
        }
      }
    }
  }, [searchParams, user])

  // ログインユーザーの情報をフォームに自動入力
  useEffect(() => {
    if (user && step === 5) {
      // 各フィールドが空の場合、ユーザー情報で自動補完
      setFormData((prevData) => ({
        name: prevData.name || user.name || '',
        email: prevData.email || user.email || '',
        phone: prevData.phone || user.phone || '',
        notes: prevData.notes || '',
      }))
    }
  }, [user, step])

  const handleServiceSelect = (service: string, isMonitor?: boolean) => {
    setSelectedService(service)
    setIsMonitorPrice(isMonitor || false)
    setStep(2)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setStep(3)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(4)
  }

  const handleMaintenanceSelect = (options: string[], totalPrice: number) => {
    setSelectedMaintenanceOptions(options)
    // メンテナンス料金 = 合計価格 - ベースサービス価格
    const service = serviceData[selectedService as keyof typeof serviceData]
    const basePrice = isMonitorPrice && service.monitorPrice ? service.monitorPrice : service.price
    setMaintenancePrice(totalPrice - basePrice)
    setStep(5)
  }

  const handleFormSubmit = async (data: {
    name: string
    email: string
    phone: string
    notes: string
  }) => {
    setFormData(data)
    setIsSubmitting(true)

    // 未ログインユーザーの場合
    if (!user) {
      // 予約情報を保存（現在のステップとポイント情報も含む）
      reservationStorage.save({
        serviceId: selectedService,
        serviceType: selectedService as '2D' | '3D' | '4D',
        serviceName: serviceData[selectedService as keyof typeof serviceData].name,
        date: selectedDate,
        time: selectedTime,
        maintenanceOptions: selectedMaintenanceOptions,
        maintenancePrice: maintenancePrice,
        formData: data,
        step: 5, // 予約確認画面のステップ
        pointsToUse: pointsToUse,
        isReadyToSubmit: true, // 予約確定ボタンを押した状態
      })

      // 会員登録ページへリダイレクト
      router.push('/register?reservation=true')
      return
    }

    try {
      const service = serviceData[selectedService as keyof typeof serviceData]
      const basePrice = isMonitorPrice && service.monitorPrice ? service.monitorPrice : service.price
      const totalPrice = basePrice + maintenancePrice
      const finalPrice = totalPrice - pointsToUse

      const reservationData = {
        serviceType: selectedService as '2D' | '3D' | '4D',
        serviceName: service.name,
        price: basePrice,
        maintenanceOptions: selectedMaintenanceOptions,
        maintenancePrice: maintenancePrice,
        totalPrice: totalPrice,
        date: selectedDate,
        time: selectedTime,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        notes: isMonitorPrice ? `${formData.notes}\n【モニター価格適用】写真撮影にご協力いただきます` : formData.notes,
        status: 'pending' as const,
        isMonitor: isMonitorPrice,
        finalPrice: finalPrice,
        pointsUsed: pointsToUse,
      }

      // API経由で予約を作成（サーバーサイドでFirebase Admin SDKを使用）
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '予約の作成に失敗しました')
      }

      const result = await response.json()
      console.log('Reservation created:', result.reservationId)

      router.push('/reservation/complete')
    } catch (error) {
      console.error('Failed to create reservation:', error)
      alert('予約の作成に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const stepTitles = {
    1: 'サービス選択',
    2: '日付選択',
    3: '時間選択',
    4: 'メンテナンスオプション',
    5: '予約情報入力',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">予約フォーム</h1>
              <span className="text-sm text-gray-600">ステップ {step} / 5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Business Hours Info */}
          <div className="mb-6">
            <BusinessHoursInfo />
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              {stepTitles[step as keyof typeof stepTitles]}
            </h2>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ServiceSelection 
                    onSelect={handleServiceSelect} 
                    selected={selectedService}
                    isMonitorPrice={isMonitorPrice}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Calendar onSelect={handleDateSelect} selected={selectedDate} />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <TimeSlots
                    date={selectedDate}
                    onSelect={handleTimeSelect}
                    selected={selectedTime}
                  />
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <MaintenanceOptions
                    onNext={handleMaintenanceSelect}
                    baseServicePrice={
                      selectedService && serviceData[selectedService]
                        ? isMonitorPrice && serviceData[selectedService]?.monitorPrice
                          ? serviceData[selectedService].monitorPrice!
                          : serviceData[selectedService].price
                        : 0
                    }
                    isMonitorPrice={isMonitorPrice}
                  />
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ReservationForm
                    formData={formData}
                    onChange={(field, value) => setFormData({ ...formData, [field]: value })}
                    onSubmit={() => handleFormSubmit(formData)}
                    isLoggedIn={!!user}
                    servicePrice={selectedService && serviceData[selectedService] ? serviceData[selectedService].price : 0}
                    monitorPrice={selectedService && serviceData[selectedService] ? serviceData[selectedService].monitorPrice : undefined}
                    maintenancePrice={maintenancePrice}
                    onPointsUsed={setPointsToUse}
                    onMonitorPriceSelected={setIsMonitorPrice}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  戻る
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationContent />
    </Suspense>
  )
}
