'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'

import BusinessHoursInfo from '@/components/reservation/BusinessHoursInfo'
import Calendar from '@/components/reservation/Calendar'
import MaintenanceOptions from '@/components/reservation/MaintenanceOptions'
import ReservationForm from '@/components/reservation/ReservationForm'
import ServiceSelection from '@/components/reservation/ServiceSelection'
import TimeSlots from '@/components/reservation/TimeSlots'
import { useAuth } from '@/lib/auth/AuthContext'
import { getServicePlans } from '@/lib/firebase/servicePlans'
import { reservationStorage } from '@/lib/utils/reservationStorage'
import type { ServicePlan } from '@/lib/types'

function ReservationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [servicePlansLoading, setServicePlansLoading] = useState(true)
  const [servicePlansError, setServicePlansError] = useState<string | null>(null)
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

  useEffect(() => {
    const fetchServicePlans = async () => {
      try {
        const plans = await getServicePlans()
        setServicePlans(plans)
        setServicePlansError(null)
      } catch (error) {
        console.error('Failed to load service plans', error)
        setServicePlansError('サービスプランの取得に失敗しました。ページを再読み込みしてください。')
      } finally {
        setServicePlansLoading(false)
      }
    }

    fetchServicePlans()
  }, [])

  // 会員登録から戻ってきた場合、保存した予約情報を復元
  useEffect(() => {
    if (searchParams.get('from') === 'register') {
      const savedReservation = reservationStorage.get()
      if (savedReservation) {
        setSelectedService(savedReservation.serviceId)
        setIsMonitorPrice(savedReservation.isMonitor ?? false)
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

  useEffect(() => {
    if (servicePlansLoading) return
    if (!selectedService) return
    const exists = servicePlans.some((plan) => plan.id === selectedService)
    if (!exists) {
      setSelectedService('')
      setIsMonitorPrice(false)
      setStep(1)
    }
  }, [servicePlansLoading, servicePlans, selectedService])

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

  const selectedPlan = useMemo(
    () => servicePlans.find((plan) => plan.id === selectedService),
    [servicePlans, selectedService],
  )

  const baseServicePrice = useMemo(() => {
    if (!selectedPlan) return 0
    if (isMonitorPrice && selectedPlan.monitorPrice) {
      return selectedPlan.monitorPrice
    }
    return selectedPlan.price
  }, [selectedPlan, isMonitorPrice])

  const handleServiceSelect = (serviceId: string, isMonitor?: boolean) => {
    const plan = servicePlans.find((item) => item.id === serviceId)
    if (!plan) {
      alert('選択したプランが利用できなくなりました。別のプランをお選びください。')
      return
    }
    setSelectedService(serviceId)
    setIsMonitorPrice(!!isMonitor)
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
    const basePrice = baseServicePrice
    const calculated = totalPrice - basePrice
    setMaintenancePrice(calculated > 0 ? calculated : 0)
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

    if (!selectedPlan) {
      alert('サービスプランが選択されていません。再度プランを選択してください。')
      setIsSubmitting(false)
      return
    }

    // 未ログインユーザーの場合
    if (!user) {
      reservationStorage.save({
        serviceId: selectedPlan.id,
        serviceType: selectedPlan.type,
        serviceName: selectedPlan.name,
        date: selectedDate,
        time: selectedTime,
        maintenanceOptions: selectedMaintenanceOptions,
        maintenancePrice: maintenancePrice,
        formData: data,
        step: 5,
        pointsToUse,
        isMonitor: isMonitorPrice,
        isReadyToSubmit: true,
      })

      router.push('/register?reservation=true')
      setIsSubmitting(false)
      return
    }

    try {
      const basePrice = baseServicePrice
      const totalPrice = basePrice + maintenancePrice
      const finalPrice = totalPrice - pointsToUse

      const reservationData = {
        serviceType: selectedPlan.type,
        serviceName: selectedPlan.name,
        price: basePrice,
        maintenanceOptions: selectedMaintenanceOptions,
        maintenancePrice,
        totalPrice,
        date: selectedDate,
        time: selectedTime,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        notes: isMonitorPrice
          ? `${formData.notes}\n【モニター価格適用】写真撮影にご協力いただきます`
          : formData.notes,
        status: 'pending' as const,
        isMonitor: isMonitorPrice,
        finalPrice,
        pointsUsed: pointsToUse,
      }

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
                  {servicePlansLoading ? (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-600">
                      料金プランを読み込み中です…
                    </div>
                  ) : (
                    <>
                      {servicePlansError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {servicePlansError}
                        </div>
                      )}
                      <ServiceSelection
                        services={servicePlans}
                        onSelect={handleServiceSelect}
                        selected={selectedService}
                        isMonitorPrice={isMonitorPrice}
                      />
                    </>
                  )}
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
                    baseServicePrice={baseServicePrice}
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
                    servicePrice={selectedPlan ? selectedPlan.price : 0}
                    monitorPrice={selectedPlan?.monitorPrice}
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
