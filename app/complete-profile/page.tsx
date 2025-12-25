'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'
import DatePicker from '@/components/ui/DatePicker'
import { isProfileComplete } from '@/lib/utils/profileUtils'

function CompleteProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, updateProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    birthday: '',
    gender: '',
    postalCode: '',
    prefecture: '',
    city: '',
    street: '',
    agreeToTerms: false,
  })

  const redirectTo = searchParams.get('redirect') || '/mypage'
  const fromReservation = searchParams.get('reservation') === 'true'

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // すでにプロフィールが完成している場合はリダイレクト
    if (isProfileComplete(user)) {
      router.push(redirectTo)
      return
    }

    // 既存のユーザー情報をフォームに反映
    const address = typeof user.address === 'string' ? { street: user.address } : (user.address ?? {})

    setFormData({
      email: user.email || '',
      name: user.name || '',
      phone: user.phone || '',
      birthday: user.birthDate || user.birthday || '',
      gender: user.gender || '',
      postalCode: user.postalCode || (address as any).postalCode || '',
      prefecture: user.prefecture || (address as any).prefecture || '',
      city: user.city || (address as any).city || '',
      street: user.street || (address as any).street || '',
      agreeToTerms: Boolean(user.termsAcceptedAt),
    })
  }, [user, router, redirectTo])

  const needsEmail = !user?.email || user.email.trim() === ''

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

    // 必須項目のバリデーション
    if (!formData.name.trim()) {
      setError('お名前を入力してください')
      return
    }

    if (!formData.phone.trim()) {
      setError('電話番号を入力してください')
      return
    }

    if (!formData.gender) {
      setError('性別を選択してください')
      return
    }

    if (!formData.postalCode.trim()) {
      setError('郵便番号を入力してください')
      return
    }
    if (!formData.prefecture.trim()) {
      setError('都道府県を入力してください')
      return
    }
    if (!formData.city.trim()) {
      setError('市区町村を入力してください')
      return
    }
    if (!formData.street.trim()) {
      setError('番地・建物名を入力してください')
      return
    }

    if (!formData.agreeToTerms) {
      setError('利用規約とプライバシーポリシーに同意してください')
      return
    }

    if (needsEmail) {
      const emailValue = formData.email.trim()
      if (!emailValue) {
        setError('メールアドレスを入力してください')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailValue)) {
        setError('正しいメールアドレスを入力してください')
        return
      }
    }

    // 電話番号の簡易バリデーション
    const phoneRegex = /^[0-9-]+$/
    if (!phoneRegex.test(formData.phone)) {
      setError('正しい電話番号を入力してください')
      return
    }

    setIsLoading(true)

    try {
      await updateProfile({
        ...(needsEmail ? { email: formData.email.trim() } : {}),
        name: formData.name,
        phone: formData.phone,
        birthDate: formData.birthday || undefined,
        birthday: formData.birthday || undefined,
        gender: formData.gender,
        postalCode: formData.postalCode.trim(),
        prefecture: formData.prefecture.trim(),
        city: formData.city.trim(),
        address: {
          postalCode: formData.postalCode.trim(),
          prefecture: formData.prefecture.trim(),
          city: formData.city.trim(),
          street: formData.street.trim(),
        },
        termsAccepted: true,
      })

      // リダイレクト
      router.push(redirectTo)
    } catch (error) {
      console.error('Profile update error:', error)
      setError('プロフィールの更新に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    // スキップする場合（ただし、予約からの場合はスキップ不可）
    if (fromReservation) {
      setError('予約を完了するには、電話番号の入力が必要です')
      return
    }
    if (needsEmail) {
      setError('メールアドレスの入力が必要です')
      return
    }
    if (!formData.agreeToTerms) {
      setError('利用規約とプライバシーポリシーに同意してください')
      return
    }
    router.push(redirectTo)
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-light-accent flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          プロフィールを完成させましょう
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          サービスをご利用いただくために、以下の情報をご入力ください
        </p>

        {fromReservation && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              予約を完了するには、電話番号の入力が必要です
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* メールアドレス */}
            {needsEmail ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="example@email.com"
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-gray-500">
                  予約確認のご連絡に使用します
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                  {user.email}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  ログイン方法から取得されました
                </p>
              </div>
            )}

            {/* お名前 */}
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
                placeholder="山田 太郎"
              />
              {formData.name && (
                <p className="mt-1 text-xs text-gray-500">
                  ログイン方法から取得されました
                </p>
              )}
            </div>

            {/* 電話番号 */}
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
              <p className="mt-1 text-xs text-gray-500">
                予約確認のご連絡に使用します
              </p>
            </div>

            {/* 性別 */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                性別 <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">選択してください</option>
                <option value="female">女性</option>
                <option value="male">男性</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 住所 */}
            <div className="space-y-4">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="123-4567"
                />
              </div>
              <div>
                <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700">
                  都道府県 <span className="text-red-500">*</span>
                </label>
                <input
                  id="prefecture"
                  name="prefecture"
                  type="text"
                  required
                  value={formData.prefecture}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="岐阜県"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  市区町村 <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="恵那市"
                />
              </div>
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                  番地・建物名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  required
                  value={formData.street}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="長島町正家1-1-1"
                />
              </div>
            </div>

            {/* 生年月日 */}
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                生年月日
                <span className="ml-2 text-xs text-gray-500">（任意）</span>
              </label>
              <DatePicker
                value={formData.birthday}
                onChange={handleDateChange}
                required={false}
              />
              <p className="mt-1 text-xs text-gray-500">（任意）ご本人確認に使用する場合があります</p>
            </div>

            {/* ボタン */}
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  required
                />
                <label htmlFor="agreeToTerms" className="text-gray-700">
                  <Link href="/terms" className="text-primary hover:text-primary/80" target="_blank">
                    利用規約
                  </Link>
                  と
                  <Link href="/privacy" className="text-primary hover:text-primary/80" target="_blank">
                    プライバシーポリシー
                  </Link>
                  に同意します
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '保存中...' : '保存して続ける'}
              </button>

              {!fromReservation && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  あとで入力する
                </button>
              )}
            </div>

            {/* プライバシーポリシー */}
            <p className="text-xs text-gray-500 text-center">
              情報の取り扱いについては
              <Link href="/privacy" className="text-primary hover:text-primary/80" target="_blank">
                プライバシーポリシー
              </Link>
              をご確認ください
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompleteProfileContent />
    </Suspense>
  )
}
