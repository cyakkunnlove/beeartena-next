'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'

import BusinessHoursInfo from '@/components/reservation/BusinessHoursInfo'
import Calendar from '@/components/reservation/Calendar'
import MaintenanceOptions from '@/components/reservation/MaintenanceOptions'
import ReservationForm from '@/components/reservation/ReservationForm'
import ReservationSummary from '@/components/reservation/ReservationSummary'
import ServiceSelection from '@/components/reservation/ServiceSelection'
import TimeSlots from '@/components/reservation/TimeSlots'
import LoginModal from '@/components/auth/LoginModal'
import { useAuth } from '@/lib/auth/AuthContext'
import { getServicePlans } from '@/lib/firebase/servicePlans'
import { reservationStorage } from '@/lib/utils/reservationStorage'
import type { PendingReservation } from '@/lib/utils/reservationStorage'
import type { ReservationIntakeForm, ServicePlan, User } from '@/lib/types'
import { createDefaultIntakeForm, normalizeIntakeForm } from '@/lib/utils/intakeFormDefaults'
import { apiClient } from '@/lib/api/client'

type ReservationFormData = {
  name: string
  email: string
  phone: string
  notes: string
  intakeForm: ReservationIntakeForm
  isMonitorSelected?: boolean
}

const createInitialFormData = (): ReservationFormData => ({
  name: '',
  email: '',
  phone: '',
  notes: '',
  intakeForm: createDefaultIntakeForm(),
  isMonitorSelected: false,
})

const isDefaultIntakeForm = (form: ReservationIntakeForm) => {
  const defaults = createDefaultIntakeForm()
  const normalized = normalizeIntakeForm(form)
  return JSON.stringify(normalized) === JSON.stringify(defaults)
}

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ReservationFormData>(createInitialFormData)
  const [isMonitorPrice, setIsMonitorPrice] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState<PendingReservation | null>(null)
  const hasRestoredRef = useRef(false)
  const hasPrefilledIntakeRef = useRef(false)
  const totalSteps = 6

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

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

  const restoreReservation = useCallback(
    (saved: PendingReservation) => {
      setSelectedService(saved.serviceId)
      setIsMonitorPrice(saved.formData?.isMonitorSelected ?? saved.isMonitor ?? false)
      setSelectedDate(saved.date)
      setSelectedTime(saved.time)
      setSelectedMaintenanceOptions(saved.maintenanceOptions || [])
      setMaintenancePrice(saved.maintenancePrice || 0)
      setFormData({
        ...createInitialFormData(),
        ...saved.formData,
        intakeForm: saved.formData?.intakeForm ?? createDefaultIntakeForm(),
        isMonitorSelected: saved.formData?.isMonitorSelected ?? saved.isMonitor ?? false,
      })
      setStep(saved.step || 5)
    },
    [],
  )

  const restoreFromStorage = useCallback(() => {
    if (hasRestoredRef.current) return
    const savedReservation = reservationStorage.get()
    if (!savedReservation) return

    restoreReservation(savedReservation)
    if (savedReservation.isReadyToSubmit) {
      setPendingAutoSubmit(savedReservation)
    } else {
      setPendingAutoSubmit(null)
    }
    reservationStorage.clear()
    hasRestoredRef.current = true
  }, [restoreReservation])

  // 会員登録から戻ってきた場合、保存した予約情報を復元
  useEffect(() => {
    const from = searchParams.get('from')
    if (from === 'register' || from === 'login') {
      restoreFromStorage()
    }
  }, [restoreFromStorage, searchParams])

  // fromパラメータが無い場合でも、保存済み予約があれば復元
  useEffect(() => {
    if (searchParams.get('from')) return
    restoreFromStorage()
  }, [restoreFromStorage, searchParams])

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

  useEffect(() => {
    if (!user) return

    if (user.role === 'admin') {
      reservationStorage.clear()
      router.replace('/admin')
      return
    }

    restoreFromStorage()

    if (showLoginModal) {
      setShowLoginModal(false)
    }
  }, [restoreFromStorage, router, showLoginModal, user])

  // ログインユーザーの情報をフォームに自動入力
  useEffect(() => {
    if (user && step === 5) {
      // 各フィールドが空の場合、ユーザー情報で自動補完
      setFormData((prevData) => ({
        ...prevData,
        name: prevData.name || user.name || '',
        email: prevData.email || user.email || '',
        phone: prevData.phone || user.phone || '',
        notes: prevData.notes || '',
        isMonitorSelected: prevData.isMonitorSelected ?? isMonitorPrice,
      }))
    }
  }, [user, step])

  useEffect(() => {
    if (!user) return
    if (step !== 5) return
    if (hasPrefilledIntakeRef.current) return
    if (!isDefaultIntakeForm(formData.intakeForm)) {
      hasPrefilledIntakeRef.current = true
      return
    }

    const fetchLatestIntake = async () => {
      try {
        const response = await apiClient.getReservations()
        const reservations = Array.isArray(response)
          ? response
          : response.reservations ?? []
        const latestWithIntake = reservations.find((reservation) => reservation?.intakeForm)
        if (!latestWithIntake?.intakeForm) {
          return
        }

        const normalized = normalizeIntakeForm(latestWithIntake.intakeForm)
        setFormData((prev) => ({
          ...prev,
          intakeForm: normalized,
        }))
      } catch (error) {
        console.error('Failed to fetch intake form history', error)
      } finally {
        hasPrefilledIntakeRef.current = true
      }
    }

    void fetchLatestIntake()
  }, [formData.intakeForm, step, user])

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

  const executeReservation = useCallback(
    async (data: ReservationFormData) => {
      if (!selectedPlan) {
        alert('サービスプランが選択されていません。再度プランを選択してください。')
        return
      }

      setIsSubmitting(true)

      try {
        if (!selectedDate || !selectedTime) {
          alert('予約日時が未選択です。日付と時間を選択してください。')
          return
        }
        const reservationDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
        if (Number.isNaN(reservationDateTime.getTime())) {
          alert('予約日時の形式が不正です。日付と時間を選び直してください。')
          return
        }

        const basePrice = baseServicePrice
        const totalPrice = basePrice + maintenancePrice
        const finalPrice = totalPrice

        const reservationData = {
          serviceType: selectedPlan.type,
          serviceName: selectedPlan.name,
          price: basePrice,
          maintenanceOptions: selectedMaintenanceOptions,
          maintenancePrice,
          totalPrice,
          date: selectedDate,
          time: selectedTime,
          customerName: data.name,
          customerPhone: data.phone,
          customerEmail: data.email,
          notes: isMonitorPrice
            ? `${data.notes}\n【モニター価格適用】写真撮影にご協力いただきます`
            : data.notes,
          status: 'pending' as const,
          isMonitor: isMonitorPrice,
          finalPrice,
          intakeForm: data.intakeForm,
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
        reservationStorage.clear()
        router.push('/reservation/complete')
    } catch (error) {
      console.error('Failed to create reservation:', error)
      const message =
        error instanceof Error
          ? error.message
          : '予約の作成に失敗しました。もう一度お試しください。'
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
    },
    [
      baseServicePrice,
      isMonitorPrice,
      maintenancePrice,
      router,
      selectedDate,
      selectedMaintenanceOptions,
      selectedPlan,
      selectedTime,
    ],
  )

  useEffect(() => {
    if (!pendingAutoSubmit) return
    if (!user) return
    if (!selectedPlan || selectedPlan.id !== pendingAutoSubmit.serviceId) return

    void executeReservation(pendingAutoSubmit.formData)
    setPendingAutoSubmit(null)
  }, [pendingAutoSubmit, selectedPlan, executeReservation, user])

  const handleServiceSelect = (serviceId: string) => {
    const plan = servicePlans.find((item) => item.id === serviceId)
    if (!plan) {
      alert('選択したプランが利用できなくなりました。別のプランをお選びください。')
      return
    }
    setSelectedService(serviceId)
    setIsMonitorPrice(false)
    setFormData((prev) => ({
      ...prev,
      isMonitorSelected: false,
    }))
    setStep(2)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime('')
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

  const handleFormFieldChange = useCallback(
    (field: 'name' | 'email' | 'phone' | 'notes' | 'isMonitorSelected', value: string) => {
      if (field === 'isMonitorSelected') {
        const boolValue = value === 'true'
        setFormData((prev) => ({
          ...prev,
          isMonitorSelected: boolValue,
        }))
        setIsMonitorPrice(boolValue)
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }))
      }
    },
    [],
  )

  const handleIntakeChange = useCallback((next: ReservationIntakeForm) => {
    setFormData((prev) => ({
      ...prev,
      intakeForm: next,
    }))
  }, [])

  const savePendingReservation = useCallback(
    (form: ReservationFormData, options?: { isReadyToSubmit?: boolean }) => {
      if (!selectedPlan) return

      reservationStorage.save({
        serviceId: selectedPlan.id,
        serviceType: selectedPlan.type,
        serviceName: selectedPlan.name,
        date: selectedDate,
        time: selectedTime,
        maintenanceOptions: selectedMaintenanceOptions,
        maintenancePrice,
        formData: {
          ...form,
          isMonitorSelected: form.isMonitorSelected ?? isMonitorPrice,
        },
        step,
        isMonitor: isMonitorPrice,
        isReadyToSubmit: options?.isReadyToSubmit ?? false,
      })
    },
    [
      isMonitorPrice,
      maintenancePrice,
      selectedDate,
      selectedMaintenanceOptions,
      selectedPlan,
      selectedTime,
      step,
    ],
  )

  useEffect(() => {
    if (!selectedPlan) return
    const existing = reservationStorage.get()
    const preserveReady = existing?.isReadyToSubmit ?? false
    savePendingReservation(formData, { isReadyToSubmit: preserveReady })
  }, [
    formData,
    savePendingReservation,
    selectedPlan,
  ])

  const handleLoginModalRegister = useCallback(() => {
    const saved = reservationStorage.get()
    if (saved) {
      const { timestamp: _timestamp, ...rest } = saved
      reservationStorage.save({
        ...rest,
        isReadyToSubmit: true,
      })
    } else {
      savePendingReservation(formData, { isReadyToSubmit: true })
    }
  }, [formData, savePendingReservation])

  const handlePromptLogin = useCallback(
    (currentForm: ReservationFormData) => {
      savePendingReservation(currentForm, { isReadyToSubmit: false })
      setShowLoginModal(true)
    },
    [savePendingReservation],
  )

  const handleLoginSuccess = useCallback(
    (loggedInUser: User) => {
      if (loggedInUser.role === 'admin') {
        reservationStorage.clear()
        router.replace('/admin')
        return
      }
      setShowLoginModal(false)
    },
    [router],
  )

  const handleFormSubmit = async (data: ReservationFormData) => {
    const monitorFlag = data.isMonitorSelected ?? isMonitorPrice
    const nextData: ReservationFormData = {
      ...data,
      isMonitorSelected: monitorFlag,
    }

    setFormData(nextData)
    setIsMonitorPrice(monitorFlag)

    if (!selectedPlan) {
      alert('サービスプランが選択されていません。再度プランを選択してください。')
      return
    }

    // 未ログインユーザーの場合はログインモーダルを表示
    if (!user) {
      savePendingReservation(nextData, { isReadyToSubmit: false })
      setShowLoginModal(true)
      return
    }

    setStep(6)
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
    6: '内容確認',
  }

  return (
    <>
      <div className="min-h-screen bg-light-accent">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold">予約フォーム</h1>
                <span className="text-sm text-gray-600">ステップ {step} / {totalSteps}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Business Hours Info */}
            <div className="mb-6">
              <BusinessHoursInfo />
            </div>

            {/* Step Content */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-6 text-xl font-semibold">
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
                    <Calendar
                      onSelect={handleDateSelect}
                      selected={selectedDate}
                      durationMinutes={selectedPlan?.duration}
                    />
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
                      key={selectedDate}
                      date={selectedDate}
                      onSelect={handleTimeSelect}
                      selected={selectedTime}
                      durationMinutes={selectedPlan?.duration}
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
                    onChange={handleFormFieldChange}
                    onSubmit={handleFormSubmit}
                    isLoggedIn={!!user}
                    servicePrice={selectedPlan ? selectedPlan.price : 0}
                    monitorPrice={selectedPlan?.monitorPrice}
                    maintenancePrice={maintenancePrice}
                    onRequestLogin={handlePromptLogin}
                    onIntakeChange={handleIntakeChange}
                  />
                </motion.div>
              )}

              {step === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ReservationSummary
                    selectedPlan={selectedPlan}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    isMonitorSelected={isMonitorPrice}
                    formData={{
                      name: formData.name,
                      email: formData.email,
                      phone: formData.phone,
                      notes: formData.notes,
                      intakeForm: formData.intakeForm,
                    }}
                    maintenanceOptions={selectedMaintenanceOptions}
                    maintenancePrice={maintenancePrice}
                    baseServicePrice={baseServicePrice}
                    onBack={() => setStep(5)}
                    onConfirm={() => {
                      void executeReservation(formData)
                    }}
                    isSubmitting={isSubmitting}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {step <= 5 && (
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
            )}
          </div>
        </div>
      </div>
    </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        onRegister={handleLoginModalRegister}
        defaultEmail={formData.email}
      />
    </>
  )
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationContent />
    </Suspense>
  )
}
