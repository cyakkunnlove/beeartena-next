'use client'

import { useEffect, useState } from 'react'

import IntakeQuestionnaire from '@/components/reservation/IntakeQuestionnaire'
import type { ReservationIntakeForm } from '@/lib/types'

interface ReservationFormProps {
  formData: {
    name: string
    email: string
    phone: string
    notes: string
    intakeForm: ReservationIntakeForm
    isMonitorSelected?: boolean
  }
  onChange: (field: 'name' | 'email' | 'phone' | 'notes' | 'isMonitorSelected', value: string) => void
  onSubmit: (form: ReservationFormProps['formData']) => void
  isLoggedIn: boolean
  servicePrice: number
  monitorPrice?: number
  maintenancePrice?: number
  onRequestLogin?: (currentForm: ReservationFormProps['formData']) => void
  onIntakeChange: (value: ReservationIntakeForm) => void
}

export default function ReservationForm({
  formData,
  onChange,
  onSubmit,
  isLoggedIn,
  servicePrice,
  monitorPrice,
  maintenancePrice = 0,
  onRequestLogin,
  onIntakeChange,
}: ReservationFormProps) {
  const [cancellationPolicy, setCancellationPolicy] = useState<string>('')
  const monitorSelected = formData.isMonitorSelected ?? false
  const basePrice = monitorSelected && monitorPrice ? monitorPrice : servicePrice

  useEffect(() => {
    // キャンセルポリシーを取得
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const settings = await response.json()
          if (settings.cancellationPolicy) {
            setCancellationPolicy(settings.cancellationPolicy)
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isLoggedIn ? (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            会員情報から自動入力されています。
            変更が必要な場合は、以下のフォームで修正してください。
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800">ログインすると入力が自動保存されます</h3>
          <p className="text-xs text-blue-700 mt-1">
            会員登録済みの方はログインするとお名前や連絡先が自動入力されます。
          </p>
          {onRequestLogin && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-dark-gold"
              onClick={() => onRequestLogin(formData)}
            >
              会員ログインして続ける
            </button>
          )}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="山田 花子"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="example@email.com"
        />
        <p className="mt-1 text-xs text-gray-500">予約確認メールをお送りします</p>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="090-1234-5678"
        />
        <p className="mt-1 text-xs text-gray-500">予約確認のご連絡をさせていただく場合があります</p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          ご要望・ご質問（任意）
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="アレルギーやご要望がございましたら、こちらにご記入ください"
        />
      </div>

      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">🩺 事前問診票</h2>
          <p className="mt-2 text-sm text-gray-600">
            施術の安全性を確認するため、以下の設問にご回答ください。内容は施術に関わるスタッフのみに共有されます。
          </p>
        </div>
        <IntakeQuestionnaire value={formData.intakeForm} onChange={onIntakeChange} />
      </div>

      {monitorPrice && monitorPrice > 0 && (
        <div className="border rounded-lg p-4 bg-amber-50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">📷 モニター価格</p>
              <p className="text-lg font-bold text-amber-900">
                {monitorSelected
                  ? `モニター価格: ¥${monitorPrice.toLocaleString()}`
                  : `¥${servicePrice.toLocaleString()}`}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              monitorSelected ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-900'
            }`}>
              {monitorSelected ? 'モニター適用中' : '通常価格'}
            </span>
          </div>
          <p className="text-sm text-amber-900">
            {monitorSelected
              ? '写真撮影にご協力いただくことでモニター価格が適用されています。'
              : '施術前後の写真撮影・SNS掲載にご協力いただける方はモニター価格が適用されます。'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onChange('isMonitorSelected', 'false')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                !monitorSelected
                  ? 'border-primary bg-primary/10 text-primary cursor-default'
                  : 'border-gray-300 hover:border-primary/60 hover:text-primary'
              }`}
              disabled={!monitorSelected}
            >
              通常価格を適用
            </button>
            <button
              type="button"
              onClick={() => onChange('isMonitorSelected', 'true')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                monitorSelected
                  ? 'border-primary bg-primary text-white cursor-default'
                  : 'border-primary text-primary hover:bg-primary/10'
              }`}
              disabled={monitorSelected}
            >
              モニター価格を適用
            </button>
          </div>
          <p className="text-xs text-amber-800">
            ※ モニター価格を適用する場合は、施術前後の写真撮影にご協力いただきます。
          </p>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">注意事項</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>施術当日は、通常通りメイクをしてお越しください</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>妊娠中・授乳中の方は施術を受けることができません</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>アレルギーや皮膚疾患のある方は、事前にご相談ください</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              {cancellationPolicy || 'キャンセルはご予約の3日前（72時間前）までにご連絡ください'}
            </span>
          </li>
        </ul>
      </div>

      <div className="flex items-start gap-2">
        <input type="checkbox" id="agreement" required className="mt-1" />
        <label htmlFor="agreement" className="text-sm text-gray-600">
          <a href="/terms" target="_blank" className="text-primary hover:text-dark-gold underline">
            利用規約
          </a>
          および注意事項を確認し、同意します <span className="text-red-500">*</span>
        </label>
      </div>

      <button type="submit" className="w-full btn btn-primary">
        内容確認へ進む
      </button>

      {!isLoggedIn && (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">会員登録すると予約がよりスムーズになります</p>
          <a href="/register" className="text-primary hover:text-dark-gold text-sm font-medium">
            会員登録はこちら →
          </a>
        </div>
      )}
    </form>
  )
}
