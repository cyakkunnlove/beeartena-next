'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ServicePlan } from '@/lib/types'
const PLAN_TYPE_OPTIONS: ServicePlan['type'][] = ['2D', '3D', '4D', 'wax', 'smp', 'retouch']

type FormValues = {
  id?: string
  name: string
  description: string
  type: ServicePlan['type']
  price: string
  monitorPrice: string
  monitorEnabled: boolean
  otherShopPrice: string
  campaignPrice: string
  campaignReferralDiscount: string
  secondPrice: string
  retouchPrice3m: string
  retouchPrice6m: string
  durationText: string
  duration: string
  image: string
  badge: string
  note: string
  effectiveFrom: string
  effectiveUntil: string
  displayOrder: string
  isPublished: boolean
  isFeatured: boolean
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
type FirestoreDateLike = Date | string | { toDate?: () => Date }

const resolveDateValue = (value?: FirestoreDateLike | null) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const parsed = value.toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const toInputValue = (value?: FirestoreDateLike | null) => {
  const date = resolveDateValue(value)
  if (!date) return ''
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

const toIsoString = (value: string) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

const getInitialFormValues = (
  plan?: ServicePlan | null,
  overrides?: Partial<FormValues>,
): FormValues => {
  const nowInput = toInputValue(new Date())
  return {
    id: plan?.id ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    type: plan?.type ?? '2D',
    price: plan?.price != null ? String(plan.price) : '',
    monitorPrice: plan?.monitorPrice != null ? String(plan.monitorPrice) : '',
    monitorEnabled: plan?.monitorEnabled ?? false,
    otherShopPrice: plan?.otherShopPrice != null ? String(plan.otherShopPrice) : '',
    campaignPrice: plan?.campaignPrice != null ? String(plan.campaignPrice) : '',
    campaignReferralDiscount: plan?.campaignReferralDiscount != null ? String(plan.campaignReferralDiscount) : '',
    secondPrice: plan?.secondPrice != null ? String(plan.secondPrice) : '',
    retouchPrice3m: plan?.retouchPrice3m != null ? String(plan.retouchPrice3m) : '',
    retouchPrice6m: plan?.retouchPrice6m != null ? String(plan.retouchPrice6m) : '',
    durationText: plan?.durationText ?? '',
    duration: plan?.duration != null ? String(plan.duration) : '',
    image: plan?.image ?? '',
    badge: plan?.badge ?? '',
    note: plan?.note ?? '',
    effectiveFrom: toInputValue(plan?.effectiveFrom) || nowInput,
    effectiveUntil: toInputValue(plan?.effectiveUntil) || '',
    displayOrder: plan?.displayOrder != null ? String(plan.displayOrder) : '1',
    isPublished: plan?.isPublished ?? true,
    isFeatured: plan?.isFeatured ?? false,
    ...overrides,
  }
}
interface ServicePlanFormProps {
  mode: 'create' | 'edit'
  plan?: ServicePlan | null
  defaults?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<void> | void
  onCancel: () => void
  submitting: boolean
}

function ServicePlanForm({
  mode,
  plan,
  defaults,
  onSubmit,
  onCancel,
  submitting,
}: ServicePlanFormProps) {
  const [values, setValues] = useState<FormValues>(() => getInitialFormValues(plan, defaults))

  useEffect(() => {
    setValues(getInitialFormValues(plan, defaults))
  }, [plan, defaults])

  const handleChange = (field: keyof FormValues, value: string | boolean) => {
    setValues((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? value : value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {mode === 'create' ? '新規サービスプランを追加' : 'サービスプランを編集'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          閉じる
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">プラン名</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => handleChange('name', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="例: 3Dフェザーブロウ"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">分類</span>
          <select
            value={values.type}
            onChange={(event) => handleChange('type', event.target.value)}
            className="border rounded-md px-3 py-2"
          >
            {PLAN_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">説明</span>
          <textarea
            value={values.description}
            onChange={(event) => handleChange('description', event.target.value)}
            className="border rounded-md px-3 py-2"
            rows={3}
            placeholder="プランの特徴を入力してください"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">通常価格 (円)</span>
          <input
            type="number"
            min="0"
            value={values.price}
            onChange={(event) => handleChange('price', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="22000"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">モニター価格 (円)</span>
          <input
            type="number"
            min="0"
            value={values.monitorPrice}
            onChange={(event) => handleChange('monitorPrice', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="20000"
          />
          <span className="text-xs text-gray-500">空欄の場合はモニター価格なしとします</span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">他店参考価格 (任意)</span>
          <input
            type="number"
            min="0"
            value={values.otherShopPrice}
            onChange={(event) => handleChange('otherShopPrice', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="14000"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">施術時間 (分)</span>
          <input
            type="number"
            min="30"
            step="5"
            value={values.duration}
            onChange={(event) => handleChange('duration', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="120"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">表示用時間テキスト (任意)</span>
          <input
            type="text"
            value={values.durationText}
            onChange={(event) => handleChange('durationText', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="約2.5〜3時間"
          />
        </label>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <h4 className="font-semibold text-sm mb-3">🎉 キャンペーン価格</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">1回目価格 (任意)</span>
              <input
                type="number"
                value={values.campaignPrice}
                onChange={(event) => handleChange('campaignPrice', event.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="30000"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">紹介割引額 (任意)</span>
              <input
                type="number"
                value={values.campaignReferralDiscount}
                onChange={(event) => handleChange('campaignReferralDiscount', event.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="3000"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">2回目価格 (任意)</span>
              <input
                type="number"
                value={values.secondPrice}
                onChange={(event) => handleChange('secondPrice', event.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="25000"
              />
            </label>
          </div>
        </div>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <h4 className="font-semibold text-sm mb-3">🔄 リタッチ価格</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">3ヶ月以内 (任意)</span>
              <input
                type="number"
                value={values.retouchPrice3m}
                onChange={(event) => handleChange('retouchPrice3m', event.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="11000"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">6ヶ月以内 (任意)</span>
              <input
                type="number"
                value={values.retouchPrice6m}
                onChange={(event) => handleChange('retouchPrice6m', event.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="15000"
              />
            </label>
          </div>
        </div>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <h4 className="font-semibold text-sm mb-3">📷 モニター価格</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={values.monitorEnabled}
                onChange={(event) => handleChange('monitorEnabled', event.target.checked)}
                className="h-4 w-4"
              />
              <span>モニター価格を表示する</span>
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">補足テキスト (任意)</span>
          <input
            type="text"
            value={values.note}
            onChange={(event) => handleChange('note', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="※ 複数回推奨"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">表示順</span>
          <input
            type="number"
            min="1"
            value={values.displayOrder}
            onChange={(event) => handleChange('displayOrder', event.target.value)}
            className="border rounded-md px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">掲載開始日</span>
          <input
            type="datetime-local"
            value={values.effectiveFrom}
            onChange={(event) => handleChange('effectiveFrom', event.target.value)}
            className="border rounded-md px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">掲載終了日 (任意)</span>
          <input
            type="datetime-local"
            value={values.effectiveUntil}
            onChange={(event) => handleChange('effectiveUntil', event.target.value)}
            className="border rounded-md px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(event) => handleChange('isPublished', event.target.checked)}
            className="h-4 w-4"
          />
          <span>公開状態にする</span>
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">バッジ表示テキスト (任意)</span>
          <input
            type="text"
            value={values.badge}
            onChange={(event) => handleChange('badge', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="人気No.1"
          />
          <span className="text-xs text-gray-500">カード右上に表示する短いテキストを設定できます</span>
        </label>

        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(event) => handleChange('isFeatured', event.target.checked)}
            className="h-4 w-4"
          />
          <span>おすすめプランとして強調表示する</span>
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">画像パス (任意)</span>
          <input
            type="text"
            value={values.image}
            onChange={(event) => handleChange('image', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="/images/4D.jpg"
          />
          <span className="text-xs text-gray-500">サイト内パス（例: /images/4D.jpg）またはURLを入力</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={submitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? '保存中…' : '保存する'}
        </button>
      </div>
    </form>
  )
}
const formatCurrency = (value?: number) => {
  if (value == null) return '-'
  return numberFormatter.format(value)
}

const formatDateRange = (from?: FirestoreDateLike | null, until?: FirestoreDateLike | null) => {
  const fromDate = resolveDateValue(from)
  if (!fromDate) return '未設定'

  const start = dateFormatter.format(fromDate)
  const untilDate = resolveDateValue(until)
  if (!untilDate) return `${start} 〜 継続`

  return `${start} 〜 ${dateFormatter.format(untilDate)}`
}
export default function ServicePlansAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const closeForm = () => {
    if (formSubmitting) return
    setShowForm(false)
    setEditingPlan(null)
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    window.setTimeout(() => {
      setFeedback(null)
    }, 4000)
  }
  const fetchPlans = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      setRefreshing(true)
      const response = await apiClient.getAdminServicePlans()
      setPlans(response.plans as ServicePlan[])
    } catch (error) {
      console.error('Failed to load service plans', error)
      showFeedback('error', 'サービスプランの取得に失敗しました')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'admin') {
      router.push('/')
      return
    }
    fetchPlans()
  }, [authLoading, user, router, fetchPlans])

  useEffect(() => {
    if (!showForm) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, formSubmitting])

  const handleCreateClick = () => {
    setEditingPlan(null)
    setShowForm(true)
  }

  const handleEditClick = (plan: ServicePlan) => {
    setEditingPlan(plan)
    setShowForm(true)
  }
  const handleTogglePublish = async (plan: ServicePlan) => {
    try {
      setBusyAction(`toggle-${plan.id}`)
      await apiClient.updateAdminServicePlan(plan.id, { isPublished: !plan.isPublished })
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id ? { ...item, isPublished: !plan.isPublished } : item,
        ),
      )
      showFeedback('success', !plan.isPublished ? 'プランを公開しました' : 'プランを非公開にしました')
    } catch (error) {
      console.error('Failed to toggle publish', error)
      showFeedback('error', '公開状態の更新に失敗しました')
    } finally {
      setBusyAction(null)
    }
  }
  const handleDelete = async (plan: ServicePlan) => {
    const confirmed = window.confirm(`${plan.name} を削除しますか？この操作は元に戻せません。`)
    if (!confirmed) return
    try {
      setBusyAction(`delete-${plan.id}`)
      await apiClient.deleteAdminServicePlan(plan.id)
      setPlans((prev) => prev.filter((item) => item.id !== plan.id))
      showFeedback('success', 'プランを削除しました')
    } catch (error) {
      console.error('Failed to delete service plan', error)
      showFeedback('error', 'プランの削除に失敗しました')
    } finally {
      setBusyAction(null)
    }
  }
  const handleFormSubmit = async (values: FormValues) => {
    const price = Number(values.price)
    const monitorPrice = values.monitorPrice ? Number(values.monitorPrice) : undefined
    const otherShopPrice = values.otherShopPrice ? Number(values.otherShopPrice) : undefined
    const duration = Number(values.duration)
    const displayOrder = Number(values.displayOrder)

    const parseOptionalNum = (val: string) => {
      const n = Number(val)
      return val.trim() !== '' && Number.isFinite(n) ? n : null
    }

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      type: values.type,
      price: Number.isFinite(price) ? price : 0,
      monitorPrice: parseOptionalNum(values.monitorPrice),
      monitorEnabled: values.monitorEnabled,
      otherShopPrice: parseOptionalNum(values.otherShopPrice),
      campaignPrice: parseOptionalNum(values.campaignPrice),
      campaignReferralDiscount: parseOptionalNum(values.campaignReferralDiscount),
      secondPrice: parseOptionalNum(values.secondPrice),
      retouchPrice3m: parseOptionalNum(values.retouchPrice3m),
      retouchPrice6m: parseOptionalNum(values.retouchPrice6m),
      durationText: values.durationText.trim() || null,
      duration: Number.isFinite(duration) ? duration : 0,
      image: values.image.trim() || null,
      badge: values.badge.trim() || null,
      note: values.note.trim() || null,
      isFeatured: values.isFeatured,
      isPublished: values.isPublished,
      effectiveFrom: toIsoString(values.effectiveFrom) || new Date().toISOString(),
      effectiveUntil: toIsoString(values.effectiveUntil),
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : plans.length + 1,
    }

    const sanitizedEntries = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    )

    const updatePayload = sanitizedEntries as Partial<
      Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>
    >
    const createPayload = sanitizedEntries as unknown as Omit<
      ServicePlan,
      'id' | 'createdAt' | 'updatedAt'
    >

    try {
      setFormSubmitting(true)
      if (editingPlan) {
        const updateRes = await apiClient.updateAdminServicePlan(editingPlan.id, updatePayload)
        if (!updateRes?.success) throw new Error(updateRes?.message ?? '更新に失敗しました')
        await fetchPlans()
        showFeedback('success', 'プランを更新しました')
      } else {
        const createRes = await apiClient.createAdminServicePlan(createPayload)
        if (!createRes?.success) throw new Error(createRes?.message ?? '作成に失敗しました')
        await fetchPlans()
        showFeedback('success', 'プランを追加しました')
      }
      closeForm()
    } catch (error) {
      console.error('Failed to save service plan', error)
      showFeedback('error', 'プランの保存に失敗しました')
    } finally {
      setFormSubmitting(false)
    }
  }
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => a.displayOrder - b.displayOrder)
  }, [plans])

  const createDefaults = useMemo<Partial<FormValues>>(
    () => ({
      displayOrder: String(plans.length + 1),
      effectiveFrom: toInputValue(new Date()),
    }),
    [plans.length],
  )

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-600">読み込み中です…</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">サービスプラン管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            予約フォームに表示されるメニューと価格を管理します。公開状態を切り替えると即座に反映されます。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={fetchPlans}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
            disabled={refreshing}
          >
            {refreshing ? '更新中…' : '最新の情報に更新'}
          </button>
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary/90"
          >
            新規プランを追加
          </button>
        </div>
      </div>
	      {feedback && (
	        <div
	          className={`rounded-md px-4 py-3 text-sm ${
	            feedback.type === 'success'
	              ? 'bg-green-50 text-green-700 border border-green-200'
	              : 'bg-red-50 text-red-700 border border-red-200'
	          }`}
	        >
	          {feedback.message}
	        </div>
	      )}
	      {showForm && (
	        <div
	          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
	          role="dialog"
	          aria-modal="true"
	          aria-label={editingPlan ? 'サービスプランを編集' : 'サービスプランを追加'}
	          onMouseDown={(event) => {
	            if (event.target === event.currentTarget) {
	              closeForm()
	            }
	          }}
	        >
	          <div className="w-full max-w-4xl">
	            <ServicePlanForm
	              mode={editingPlan ? 'edit' : 'create'}
	              plan={editingPlan ?? undefined}
	              defaults={editingPlan ? undefined : createDefaults}
	              onSubmit={handleFormSubmit}
	              onCancel={closeForm}
	              submitting={formSubmitting}
	            />
	          </div>
	        </div>
	      )}
	      <div className="bg-white shadow-md rounded-lg overflow-hidden">
	        {sortedPlans.length === 0 ? (
	          <div className="p-6 text-center text-sm text-gray-600">
	            まだサービスプランが登録されていません。「新規プランを追加」をクリックして登録してください。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    表示順
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    プラン情報
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    価格
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    モニター価格
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    公開状態
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    掲載期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlans.map((plan) => (
                  <tr key={plan.id} className="align-top">
                    <td className="px-4 py-3 text-sm text-gray-700">{plan.displayOrder}</td>
                    <td className="px-4 py-3 space-y-1">
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        {plan.name}
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {plan.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{plan.description}</p>
                      <p className="text-xs text-gray-400">ID: {plan.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{formatCurrency(plan.price)}</div>
                      <div className="text-xs text-gray-500">{plan.duration} 分</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {plan.monitorPrice ? formatCurrency(plan.monitorPrice) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          plan.isPublished
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {plan.isPublished ? '公開中' : '非公開'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {formatDateRange(plan.effectiveFrom, plan.effectiveUntil)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right space-y-2">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(plan)}
                          className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(plan)}
                          className="px-3 py-1 border border-primary text-primary rounded-md hover:bg-primary/5 disabled:opacity-60"
                          disabled={busyAction === `toggle-${plan.id}`}
                        >
                          {plan.isPublished ? '非公開にする' : '公開する'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan)}
                          className="px-3 py-1 border border-red-400 text-red-500 rounded-md hover:bg-red-50 disabled:opacity-60"
                          disabled={busyAction === `delete-${plan.id}`}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
