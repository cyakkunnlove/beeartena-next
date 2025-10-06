'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import PasswordChangeModal from '@/components/account/PasswordChangeModal'
import AccountDeleteModal from '@/components/account/AccountDeleteModal'
import { useAuth } from '@/lib/auth/AuthContext'
import { apiClient } from '@/lib/api/client'
import { firebaseAuth } from '@/lib/firebase/auth'
import { storageService } from '@/lib/storage/storageService'
import { Customer } from '@/lib/types'

type ProfileFormState = {
  name: string
  email: string
  phone: string
  birthDate: string
  gender: string
  prefecture: string
  city: string
  street: string
  postalCode: string
}

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

const toDateInputValue = (value: unknown): string => {
  if (!value) return ''
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0]
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0]
  }
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      const parsed = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }
  return ''
}

const parseAddress = (value: unknown): Record<string, unknown> => {
  if (!value) return {}
  if (typeof value === 'string') {
    return { street: value }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }
  return {}
}

const getRecordValue = (record: Record<string, unknown>, key: string): unknown => {
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined
}

const normalizeProfileData = (
  source: Record<string, unknown> | null | undefined,
  fallbackCustomer?: Customer | null,
): ProfileFormState => {
  const getSourceValue = (key: string): unknown => (source ? source[key] : undefined)
  const address = parseAddress(getSourceValue('address'))
  const fallbackAddress = parseAddress(fallbackCustomer?.address)

  const name = toStringValue(getSourceValue('name') ?? fallbackCustomer?.name ?? '')
  const email = toStringValue(getSourceValue('email') ?? fallbackCustomer?.email ?? '')
  const phone = toStringValue(getSourceValue('phone') ?? fallbackCustomer?.phone ?? '')

  const rawBirthValue =
    getSourceValue('birthDate') ??
    getSourceValue('birthday') ??
    fallbackCustomer?.birthDate ??
    (fallbackCustomer as Record<string, unknown> | undefined)?.birthday
  const birthDate = toDateInputValue(rawBirthValue)

  const gender = toStringValue(getSourceValue('gender') ?? fallbackCustomer?.gender ?? '')
  const fallbackPostalCode =
    getRecordValue(address, 'postalCode') ??
    getRecordValue(fallbackAddress, 'postalCode') ??
    fallbackCustomer?.address?.postalCode
  const postalCode = toStringValue(getSourceValue('postalCode') ?? fallbackPostalCode ?? '')
  const fallbackPrefecture = getRecordValue(fallbackAddress, 'prefecture') ?? fallbackCustomer?.address?.prefecture
  const fallbackCity = getRecordValue(fallbackAddress, 'city') ?? fallbackCustomer?.address?.city
  const fallbackStreet =
    getRecordValue(fallbackAddress, 'street') ??
    getRecordValue(fallbackAddress, 'addressLine1') ??
    fallbackCustomer?.address?.street

  const prefecture = toStringValue(
    getSourceValue('prefecture') ?? getRecordValue(address, 'prefecture') ?? fallbackPrefecture ?? '',
  )
  const city = toStringValue(
    getSourceValue('city') ?? getRecordValue(address, 'city') ?? fallbackCity ?? '',
  )
  const street = toStringValue(
    getRecordValue(address, 'street') ??
      getRecordValue(address, 'addressLine1') ??
      getSourceValue('street') ??
      fallbackStreet ??
      '',
  )

  return {
    name,
    email,
    phone,
    birthDate,
    gender,
    prefecture,
    city,
    street,
    postalCode,
  }
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [formData, setFormData] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    prefecture: '',
    city: '',
    street: '',
    postalCode: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadProfile = useCallback(async () => {
    if (!user) return

    const fallbackCustomer = storageService.getCustomer(user.id)
    const fallbackData = normalizeProfileData(user as unknown as Record<string, unknown>, fallbackCustomer)

    setFormData(fallbackData)

    try {
      const profile = await apiClient.getCurrentUser()
      setFormData(normalizeProfileData(profile as Record<string, unknown>, fallbackCustomer))
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setFormData(fallbackData)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      void loadProfile()
    }
  }, [user, loadProfile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      gender: formData.gender,
      postalCode: formData.postalCode.trim(),
      prefecture: formData.prefecture.trim(),
      city: formData.city.trim(),
    }

    if (formData.birthDate) {
      payload.birthDate = formData.birthDate
      payload.birthday = formData.birthDate
    }

    const addressPayload: Record<string, string> = {
      prefecture: formData.prefecture.trim(),
      city: formData.city.trim(),
      street: formData.street.trim(),
    }

    payload.address = addressPayload

    try {
      const updatedUser = await updateProfile(payload)
      setFormData(normalizeProfileData(updatedUser as unknown as Record<string, unknown>))
      setMessage('プロフィールを更新しました')
      setIsEditing(false)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `エラー: ${error.message}`
          : 'エラー: プロフィールの更新に失敗しました',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    void loadProfile()
    setIsEditing(false)
    setMessage('')
  }

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    await firebaseAuth.changePassword(currentPassword, newPassword)
    setMessage('パスワードを変更しました')
  }

  const handleAccountDelete = async (password: string) => {
    await firebaseAuth.deleteAccount(password)
    // アカウント削除成功後、ホームページにリダイレクト
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">プロフィール</h1>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              編集する
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.startsWith('エラー') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label htmlFor="name" className="input-label">
                  お名前
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="email" className="input-label">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="input-field disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">※メールアドレスは変更できません</p>
              </div>

              <div className="input-group">
                <label htmlFor="phone" className="input-label">
                  電話番号
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="birthDate" className="input-label">
                  生年月日
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  disabled={true}
                  className="input-field disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ※生年月日の変更はサポートにお問い合わせください
                </p>
              </div>

              <div className="input-group">
                <label htmlFor="gender" className="input-label">
                  性別
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                >
                  <option value="">選択してください</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
          </div>

          {/* 住所情報 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">住所情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label htmlFor="postalCode" className="input-label">
                  郵便番号
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  placeholder="123-4567"
                />
              </div>

              <div className="input-group">
                <label htmlFor="prefecture" className="input-label">
                  都道府県
                </label>
                <input
                  type="text"
                  id="prefecture"
                  name="prefecture"
                  value={formData.prefecture}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  placeholder="岐阜県"
                />
              </div>

              <div className="input-group">
                <label htmlFor="city" className="input-label">
                  市区町村
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  placeholder="恵那市"
                />
              </div>

              <div className="input-group">
                <label htmlFor="street" className="input-label">
                  番地・建物名
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50"
                  placeholder="長島町正家1-1-1"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存する'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                キャンセル
              </button>
            </div>
          )}
        </form>
      </div>

      {/* アカウント設定 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">アカウント設定</h2>
        <div className="space-y-4">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="text-primary hover:text-dark-gold"
          >
            パスワードを変更
          </button>
          <div className="pt-4 border-t">
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:text-red-700"
            >
              アカウントを削除
            </button>
          </div>
        </div>
      </div>

      {/* パスワード変更モーダル */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordChange}
      />

      {/* アカウント削除モーダル */}
      <AccountDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleAccountDelete}
      />
    </div>
  )
}
