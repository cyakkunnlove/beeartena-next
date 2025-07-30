'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

import DatePicker from '@/components/ui/DatePicker'
import { useAuth } from '@/lib/auth/AuthContext'
import { reservationStorage } from '@/lib/utils/reservationStorage'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'

interface SavedReservation {
  serviceId: string
  serviceName: string
  date: string
  time: string
  formData: {
    name: string
    email: string
    phone: string
    notes?: string
  }
  step?: number
  pointsToUse?: number
  isReadyToSubmit?: boolean
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    birthday: '',
    agreeToTerms: false,
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasReservation, setHasReservation] = useState(false)
  const [savedReservation, setSavedReservation] = useState<SavedReservation | null>(null)

  useEffect(() => {
    // 予約から来た場合、保存された予約情報を取得
    const fromReservation = searchParams.get('reservation') === 'true'
    setHasReservation(fromReservation)

    if (fromReservation) {
      const reservation = reservationStorage.get()
      if (reservation) {
        setSavedReservation(reservation)
        // フォームに予約情報を反映
        setFormData((prev) => ({
          ...prev,
          name: reservation.formData.name || '',
          email: reservation.formData.email || '',
          phone: reservation.formData.phone || '',
        }))
      }
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      birthday: date,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (!formData.agreeToTerms) {
      setError('利用規約に同意してください')
      return
    }

    setIsLoading(true)

    try {
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        formData.birthday,
      )

      // 予約から来た場合は予約ページへ、そうでなければマイページへ
      if (hasReservation) {
        router.push('/reservation?from=register')
      } else {
        router.push('/mypage')
      }
    } catch (error) {
      setError('登録に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">新規会員登録</h2>
        {hasReservation && savedReservation && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>予約情報が保存されています</strong>
            </p>
            <p className="text-sm text-blue-600 mt-1">
              {savedReservation.serviceName} - {savedReservation.date} {savedReservation.time}
            </p>
            <p className="text-xs text-blue-600 mt-2">会員登録後、自動的に予約画面に戻ります</p>
          </div>
        )}
        <p className="mt-2 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            ログイン
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="090-1234-5678"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                生年月日
              </label>
              <DatePicker value={formData.birthday} onChange={handleDateChange} required={false} />
              <p className="mt-1 text-xs text-gray-500">誕生日月にポイントプレゼントがあります</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">8文字以上で入力してください</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                <Link href="/terms" className="text-primary hover:text-primary/80" target="_blank">
                  利用規約
                </Link>
                に同意します
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '登録中...' : '登録する'}
              </button>
            </div>
          </form>

          <SocialLoginButtons />
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
