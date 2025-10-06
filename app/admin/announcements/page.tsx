'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
} from '@/lib/firebase/announcements'
import type { Announcement } from '@/lib/types'
type FormValues = {
  id?: string
  title: string
  body: string
  publishAt: string
  expiresAt: string
  isPinned: boolean
  priority: string
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

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
  announcement?: Announcement | null,
  overrides?: Partial<FormValues>,
): FormValues => {
  const nowInput = toInputValue(new Date())
  return {
    id: announcement?.id,
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    publishAt: toInputValue(announcement?.publishAt) || nowInput,
    expiresAt: toInputValue(announcement?.expiresAt) || '',
    isPinned: announcement?.isPinned ?? false,
    priority: announcement?.priority != null ? String(announcement.priority) : '0',
    ...overrides,
  }
}
const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDate = (value?: FirestoreDateLike | null) => {
  const date = resolveDateValue(value)
  if (!date) return '未設定'
  return dateFormatter.format(date)
}
interface AnnouncementFormProps {
  mode: 'create' | 'edit'
  announcement?: Announcement | null
  defaults?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<void> | void
  onCancel: () => void
  submitting: boolean
}

function AnnouncementForm({
  mode,
  announcement,
  defaults,
  onSubmit,
  onCancel,
  submitting,
}: AnnouncementFormProps) {
  const [values, setValues] = useState<FormValues>(() => getInitialFormValues(announcement, defaults))

  useEffect(() => {
    setValues(getInitialFormValues(announcement, defaults))
  }, [announcement, defaults])
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
          {mode === 'create' ? '新しいお知らせを追加' : 'お知らせを編集'}
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
        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">タイトル</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => handleChange('title', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="例: 新規キャンペーンのお知らせ"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium">本文</span>
          <textarea
            value={values.body}
            onChange={(event) => handleChange('body', event.target.value)}
            className="border rounded-md px-3 py-2"
            rows={5}
            placeholder="トップページに表示したい内容を入力してください"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">公開開始日時</span>
          <input
            type="datetime-local"
            value={values.publishAt}
            onChange={(event) => handleChange('publishAt', event.target.value)}
            className="border rounded-md px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">掲載終了日時 (任意)</span>
          <input
            type="datetime-local"
            value={values.expiresAt}
            onChange={(event) => handleChange('expiresAt', event.target.value)}
            className="border rounded-md px-3 py-2"
          />
          <span className="text-xs text-gray-500">空欄の場合は手動で削除するまで表示されます</span>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={values.isPinned}
            onChange={(event) => handleChange('isPinned', event.target.checked)}
            className="h-4 w-4"
          />
          <span>お知らせをピン留めする (常に最上部に表示)</span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">優先度</span>
          <input
            type="number"
            value={values.priority}
            onChange={(event) => handleChange('priority', event.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="0"
          />
          <span className="text-xs text-gray-500">数値が大きいほど優先表示されます</span>
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
export default function AnnouncementsAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 4000)
  }
  const fetchAnnouncements = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      setRefreshing(true)
      const data = await getAllAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      console.error('Failed to load announcements', error)
      showFeedback('error', 'お知らせの取得に失敗しました')
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
    fetchAnnouncements()
  }, [authLoading, user, router, fetchAnnouncements])
  const handleCreateClick = () => {
    setEditingAnnouncement(null)
    setShowForm(true)
  }

  const handleEditClick = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setShowForm(true)
  }
  const handleTogglePin = async (announcement: Announcement) => {
    try {
      setBusyAction(`pin-${announcement.id}`)
      await updateAnnouncement(announcement.id, { isPinned: !announcement.isPinned })
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === announcement.id ? { ...item, isPinned: !announcement.isPinned } : item,
        ),
      )
      showFeedback('success', announcement.isPinned ? 'ピン留めを解除しました' : 'ピン留めしました')
    } catch (error) {
      console.error('Failed to toggle pin status', error)
      showFeedback('error', 'ピン留めの切り替えに失敗しました')
    } finally {
      setBusyAction(null)
    }
  }
  const handleDelete = async (announcement: Announcement) => {
    const confirmed = window.confirm(`${announcement.title} を削除しますか？`)
    if (!confirmed) return
    try {
      setBusyAction(`delete-${announcement.id}`)
      await deleteAnnouncement(announcement.id)
      setAnnouncements((prev) => prev.filter((item) => item.id !== announcement.id))
      showFeedback('success', 'お知らせを削除しました')
    } catch (error) {
      console.error('Failed to delete announcement', error)
      showFeedback('error', 'お知らせの削除に失敗しました')
    } finally {
      setBusyAction(null)
    }
  }
  const handleFormSubmit = async (values: FormValues) => {
    const priority = Number(values.priority)
    const payload = {
      title: values.title.trim(),
      body: values.body.trim(),
      publishAt: toIsoString(values.publishAt) || new Date().toISOString(),
      expiresAt: toIsoString(values.expiresAt),
      isPinned: values.isPinned,
      priority: Number.isFinite(priority) ? priority : 0,
    }

    try {
      setFormSubmitting(true)
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, payload)
        await fetchAnnouncements()
        showFeedback('success', 'お知らせを更新しました')
      } else {
        await createAnnouncement(payload)
        await fetchAnnouncements()
        showFeedback('success', 'お知らせを追加しました')
      }
      setShowForm(false)
    } catch (error) {
      console.error('Failed to save announcement', error)
      showFeedback('error', 'お知らせの保存に失敗しました')
    } finally {
      setFormSubmitting(false)
    }
  }
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      if (b.priority !== a.priority) return b.priority - a.priority
      const aPublish = new Date(a.publishAt).getTime()
      const bPublish = new Date(b.publishAt).getTime()
      return bPublish - aPublish
    })
  }, [announcements])

  const createDefaults = useMemo<Partial<FormValues>>(
    () => ({ publishAt: toInputValue(new Date()), priority: '0' }),
    [],
  )

  const isActive = (announcement: Announcement) => {
    const publishDate = resolveDateValue(
      announcement.publishAt as unknown as FirestoreDateLike,
    )
    if (!publishDate) return false

    const now = Date.now()
    if (publishDate.getTime() > now) return false

    if (!announcement.expiresAt) return true
    const expiresDate = resolveDateValue(announcement.expiresAt as unknown as FirestoreDateLike)
    return !expiresDate ? true : expiresDate.getTime() > now
  }
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">お知らせ管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            トップページに表示されるお知らせを管理します。ピン留めと優先度で表示順を調整できます。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={fetchAnnouncements}
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
            新しいお知らせ
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
        <AnnouncementForm
          mode={editingAnnouncement ? 'edit' : 'create'}
          announcement={editingAnnouncement ?? undefined}
          defaults={editingAnnouncement ? undefined : createDefaults}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
          submitting={formSubmitting}
        />
      )}
      <div className="space-y-4">
        {sortedAnnouncements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-sm text-gray-600">
            まだお知らせが登録されていません。「新しいお知らせ」ボタンから追加してください。
          </div>
        ) : (
          sortedAnnouncements.map((announcement) => {
            const active = isActive(announcement)
            return (
              <div key={announcement.id} className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {announcement.isPinned && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">ピン留め</span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {active ? '表示中' : '非表示'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        優先度: {announcement.priority}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{announcement.title}</h2>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{announcement.body}</p>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2 min-w-[180px]">
                    <div>
                      <span className="font-medium">公開:</span> {formatDate(announcement.publishAt)}
                    </div>
                    <div>
                      <span className="font-medium">終了:</span> {announcement.expiresAt ? formatDate(announcement.expiresAt) : '未設定'}
                    </div>
                    <div className="text-xs text-gray-400">
                      更新: {formatDate(announcement.updatedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditClick(announcement)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(announcement)}
                    className="px-3 py-1 text-sm border border-primary text-primary rounded-md hover:bg-primary/5 disabled:opacity-60"
                    disabled={busyAction === `pin-${announcement.id}`}
                  >
                    {announcement.isPinned ? 'ピン留めを解除' : 'ピン留めする'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(announcement)}
                    className="px-3 py-1 text-sm border border-red-400 text-red-500 rounded-md hover:bg-red-50 disabled:opacity-60"
                    disabled={busyAction === `delete-${announcement.id}`}
                  >
                    削除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
