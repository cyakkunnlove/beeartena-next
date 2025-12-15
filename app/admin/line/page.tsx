'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'

import type { Customer, LineConversation, LineMessage } from '@/lib/types'

type LineConfigState = {
  channelSecretConfigured: boolean
  accessTokenConfigured: boolean
  firebaseAdminConfigured: boolean
  storageBucketConfigured?: boolean
  storageBucket?: string
  receivingEnabled: boolean
  sendingEnabled: boolean
}

const formatDateTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ja-JP', { hour12: false })
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function AdminLinePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [lineConfig, setLineConfig] = useState<LineConfigState | null>(null)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  const [conversations, setConversations] = useState<LineConversation[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<LineConversation | null>(null)
  const [messages, setMessages] = useState<LineMessage[]>([])

  const [search, setSearch] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<File | null>(null)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [customerQuery, setCustomerQuery] = useState('')
  const [customerCandidates, setCustomerCandidates] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  const [statusUpdating, setStatusUpdating] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [refetchingMessageId, setRefetchingMessageId] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    try {
      const response = await apiClient.getAdminLineConfig()
      if (response?.success && response.config) {
        setLineConfig(response.config as LineConfigState)
        setWebhookUrl(typeof response.webhookUrl === 'string' ? response.webhookUrl : null)
      } else {
        setLineConfig(null)
        setWebhookUrl(null)
      }
    } catch {
      setLineConfig(null)
      setWebhookUrl(null)
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    setErrorMessage(null)
    try {
      const response = await apiClient.getAdminLineConversations({ limit: 50 })
      if (!response.success) {
        throw new Error(response.error || 'LINE会話一覧の取得に失敗しました')
      }
      setConversations(Array.isArray(response.conversations) ? response.conversations : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'LINE会話一覧の取得に失敗しました')
      setConversations([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadConversation = useCallback(async (userId: string) => {
    setLoadingDetail(true)
    setErrorMessage(null)
    try {
      const response = await apiClient.getAdminLineConversation(userId, { limit: 80 })
      if (!response.success) {
        throw new Error(response.error || 'LINE会話の取得に失敗しました')
      }

      setSelectedConversation((response.conversation as LineConversation) ?? null)
      setMessages(Array.isArray(response.messages) ? response.messages : [])

      try {
        await apiClient.markAdminLineConversationRead(userId)
        setConversations((prev) =>
          prev.map((c) => (c.userId === userId ? { ...c, unreadCount: 0 } : c)),
        )
      } catch (markError) {
        console.warn('Failed to mark LINE conversation as read', markError)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'LINE会話の取得に失敗しました')
      setSelectedConversation(null)
      setMessages([])
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') {
      router.replace('/login')
      return
    }
    void loadConfig()
    void loadConversations()
  }, [authLoading, user, router, loadConfig, loadConversations])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter((c) => {
      const name = ((c.customerName ?? c.displayName) ?? '').toLowerCase()
      const last = (c.lastMessageText ?? '').toLowerCase()
      const id = (c.userId ?? '').toLowerCase()
      return name.includes(q) || last.includes(q) || id.includes(q)
    })
  }, [conversations, search])

  const selectedTitle = (() => {
    const customerName = selectedConversation?.customerName?.trim()
    if (customerName) return customerName
    const displayName = selectedConversation?.displayName?.trim()
    if (displayName) return displayName
    return selectedUserId ? `ユーザー: ${selectedUserId}` : '会話を選択してください'
  })()

  const sendingEnabled = Boolean(lineConfig?.sendingEnabled)

  const renderMessageBody = (m: LineMessage, outbound: boolean) => {
    const fallback = m.text ?? (m.type ? `[${m.type}]` : '')
    const linkClass = outbound ? 'text-white underline underline-offset-2' : 'text-primary underline underline-offset-2'

    if (m.type === 'image' && m.mediaUrl) {
      return (
        <div className="space-y-2">
          <a href={m.mediaUrl} target="_blank" rel="noreferrer" className={linkClass}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.mediaUrl} alt={m.mediaFileName ?? 'LINE画像'} className="max-w-full rounded-lg" />
          </a>
          {m.text ? <div className="whitespace-pre-wrap break-words">{m.text}</div> : null}
        </div>
      )
    }

    if (m.type === 'video' && m.mediaUrl) {
      return (
        <div className="space-y-2">
          <video controls preload="metadata" className="w-full rounded-lg">
            <source src={m.mediaUrl} type={m.mediaContentType ?? 'video/mp4'} />
          </video>
          <a href={m.mediaUrl} target="_blank" rel="noreferrer" className={linkClass}>
            {m.mediaFileName ?? '動画を開く'}
          </a>
          {m.text ? <div className="whitespace-pre-wrap break-words">{m.text}</div> : null}
        </div>
      )
    }

    if ((m.type === 'image' || m.type === 'video') && !m.mediaUrl) {
      const showRefetch = Boolean(
        !outbound &&
          sendingEnabled &&
          lineConfig?.accessTokenConfigured &&
          (lineConfig?.storageBucketConfigured ?? false) &&
          m.id &&
          !m.id.startsWith('out_'),
      )
      return (
        <div className="space-y-1">
          <div className="whitespace-pre-wrap break-words">{fallback}</div>
          <div className={`text-[11px] ${outbound ? 'text-white/80' : 'text-gray-400'}`}>
            {!lineConfig?.accessTokenConfigured
              ? '`LINE_CHANNEL_ACCESS_TOKEN` が未設定です'
              : !(lineConfig?.storageBucketConfigured ?? false)
                ? 'Storage Bucket が未設定です（FIREBASE_ADMIN_STORAGE_BUCKET / NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET）'
                : 'メディア未保存です（設定反映後に再取得できます）'}
          </div>
          {showRefetch && (
            <button
              type="button"
              className={`text-[11px] ${outbound ? 'text-white/80' : 'text-primary'} hover:text-dark-gold disabled:opacity-60`}
              disabled={refetchingMessageId === m.id}
              onClick={async () => {
                if (!selectedUserId) return
                setRefetchingMessageId(m.id)
                setErrorMessage(null)
                try {
                  const res = await fetch('/api/admin/line/media/refetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: selectedUserId, messageId: m.id }),
                  })
                  const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
                  if (!res.ok || !json?.success) {
                    throw new Error(json?.error || '再取得に失敗しました')
                  }
                  await loadConversation(selectedUserId)
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : '再取得に失敗しました')
                } finally {
                  setRefetchingMessageId(null)
                }
              }}
            >
              {refetchingMessageId === m.id ? '再取得中…' : 'この画像/動画を再取得'}
            </button>
          )}
        </div>
      )
    }

    return <div className="whitespace-pre-wrap break-words">{fallback}</div>
  }

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId)
    setCustomerQuery('')
    setCustomerCandidates([])
    void loadConversation(userId)
  }

  useEffect(() => {
    setNoteDraft(selectedConversation?.adminNote ?? '')
  }, [selectedConversation?.userId])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    const text = draft.trim()
    if (!text) return

    setSending(true)
    setErrorMessage(null)
    try {
      await apiClient.sendAdminLineMessage(selectedUserId, text)
      setDraft('')
      await loadConversation(selectedUserId)
      await loadConversations()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'LINE送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const resetAttachment = () => {
    setAttachment(null)
    setAttachmentPreview(null)
  }

  const handlePickAttachment = (file: File | null) => {
    resetAttachment()
    if (!file) return
    setAttachment(file)
    if (!file.type.startsWith('video/')) {
      setAttachmentPreview(null)
    }
  }

  const handleSendAttachment = async () => {
    if (!selectedUserId || !attachment) return
    if (!sendingEnabled) {
      setErrorMessage('送信機能が未設定です（LINE_CHANNEL_ACCESS_TOKEN を設定してください）')
      return
    }

    const isVideo = attachment.type.startsWith('video/')
    if (isVideo && !attachmentPreview) {
      setErrorMessage('動画送信にはプレビュー画像が必要です（画像を選択してください）')
      return
    }

    setSendingMedia(true)
    setErrorMessage(null)
    try {
      const form = new FormData()
      form.set('userId', selectedUserId)
      form.set('kind', isVideo ? 'video' : 'image')
      form.set('file', attachment)
      if (isVideo && attachmentPreview) {
        form.set('preview', attachmentPreview)
      }
      if (draft.trim()) {
        form.set('caption', draft.trim())
      }

      const res = await fetch('/api/admin/line/send-media', { method: 'POST', body: form })
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || '添付の送信に失敗しました')
      }

      setDraft('')
      resetAttachment()
      await loadConversation(selectedUserId)
      await loadConversations()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '添付の送信に失敗しました')
    } finally {
      setSendingMedia(false)
    }
  }

  const handleUpdateStatus = async (status: LineConversation['status']) => {
    if (!selectedUserId) return
    setStatusUpdating(true)
    setErrorMessage(null)
    try {
      await apiClient.updateAdminLineConversation(selectedUserId, { status })
      setSelectedConversation((prev) => (prev ? { ...prev, status } : prev))
      setConversations((prev) => prev.map((c) => (c.userId === selectedUserId ? { ...c, status } : c)))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ステータス更新に失敗しました')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedUserId) return
    setNoteSaving(true)
    setErrorMessage(null)
    try {
      await apiClient.updateAdminLineConversation(selectedUserId, { adminNote: noteDraft })
      const normalized = noteDraft.trim()
      setSelectedConversation((prev) => (prev ? { ...prev, adminNote: normalized || undefined } : prev))
      setConversations((prev) =>
        prev.map((c) => (c.userId === selectedUserId ? { ...c, adminNote: normalized || undefined } : c)),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'メモ保存に失敗しました')
    } finally {
      setNoteSaving(false)
    }
  }

  const downloadConversationCsv = () => {
    if (!selectedUserId) return
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
    const header = ['timestamp', 'direction', 'type', 'text'].join(',')
    const lines = messages.map((m) => {
      const row = [
        escapeCsv(m.timestamp ?? ''),
        escapeCsv(m.direction ?? ''),
        escapeCsv(m.type ?? ''),
        escapeCsv(m.text ?? ''),
      ]
      return row.join(',')
    })
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `line_conversation_${selectedUserId}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const copyWebhookUrl = async () => {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!selectedUserId) {
      setCustomerQuery('')
      setCustomerCandidates([])
      return
    }

    const query = customerQuery.trim()
    if (query.length === 0) {
      setCustomerCandidates([])
      setCustomerSearching(false)
      return
    }

    const timer = setTimeout(() => {
      setCustomerSearching(true)
      apiClient
        .getAdminCustomers({ q: query, limit: 10 })
        .then((response) => {
          if (!response.success) {
            setCustomerCandidates([])
            return
          }
          setCustomerCandidates(Array.isArray(response.customers) ? response.customers : [])
        })
        .catch(() => setCustomerCandidates([]))
        .finally(() => setCustomerSearching(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [customerQuery, selectedUserId])

  const handleLinkCustomer = async (customerId: string) => {
    if (!selectedUserId) return
    setLinking(true)
    setErrorMessage(null)
    try {
      const response = await apiClient.linkAdminLineConversationCustomer(selectedUserId, customerId)
      if (!response.success) {
        throw new Error('顧客の紐付けに失敗しました')
      }
      await loadConversation(selectedUserId)
      await loadConversations()
      setCustomerQuery('')
      setCustomerCandidates([])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '顧客の紐付けに失敗しました')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkCustomer = async () => {
    if (!selectedUserId) return
    setLinking(true)
    setErrorMessage(null)
    try {
      const response = await apiClient.unlinkAdminLineConversationCustomer(selectedUserId)
      if (!response.success) {
        throw new Error('顧客の紐付け解除に失敗しました')
      }
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              customerId: undefined,
              customerName: undefined,
              customerEmail: undefined,
              customerPhone: undefined,
            }
          : prev,
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === selectedUserId
            ? {
                ...c,
                customerId: undefined,
                customerName: undefined,
                customerEmail: undefined,
                customerPhone: undefined,
              }
            : c,
        ),
      )
      await loadConversation(selectedUserId)
      await loadConversations()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '顧客の紐付け解除に失敗しました')
    } finally {
      setLinking(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        管理者情報を確認しています…
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">LINE管理</h1>
              <p className="text-sm text-gray-600 mt-1">
                Webhookで受信したメッセージを保存し、管理画面で検索・閲覧できます。
              </p>
              {errorMessage && <p className="text-sm text-amber-700 mt-2">{errorMessage}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void loadConversations()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loadingList}
              >
                {loadingList ? '再読込中…' : '再読込'}
              </button>
              <button onClick={() => router.push('/admin')} className="text-primary hover:text-dark-gold">
                ← 管理画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="メッセージ、名前、userIdで検索…"
              />
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loadingList ? (
                <div className="p-6 text-sm text-gray-600">読み込み中…</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">会話データがありません（Webhook受信後に表示されます）。</div>
              ) : (
                <ul className="divide-y">
                  {filteredConversations.map((c) => {
                    const active = selectedUserId === c.userId
                    const unread = typeof c.unreadCount === 'number' ? c.unreadCount : 0
                    const displayTitle = c.customerName?.trim() ? c.customerName : c.displayName?.trim() ? c.displayName : c.userId
                    return (
                      <li key={c.userId}>
                        <button
                          type="button"
                          onClick={() => handleSelect(c.userId)}
                          className={`w-full text-left p-4 hover:bg-gray-50 ${active ? 'bg-gray-50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {c.pictureUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.pictureUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs text-gray-500">LINE</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">
                                  {displayTitle}
                                  {c.customerId ? <span className="ml-1 text-xs text-gray-400">🔗</span> : null}
                                  {c.adminNote ? <span className="ml-1 text-xs text-gray-400">📝</span> : null}
                                </p>
                                {unread > 0 && (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {c.lastMessageText ?? ''}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {formatDateTime(c.lastMessageAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{selectedTitle}</h2>
                  {selectedConversation?.userId && (
                    <p className="text-xs text-gray-500 mt-1 truncate">userId: {selectedConversation.userId}</p>
                  )}
                </div>
                {selectedConversation?.statusMessage && (
                  <p className="text-xs text-gray-500 max-w-[50%] line-clamp-2">{selectedConversation.statusMessage}</p>
                )}
              </div>

            <div className="mt-3 rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">LINE連携ステータス</p>
                <button
                  type="button"
                  onClick={() => void loadConfig()}
                  className="text-xs text-primary hover:text-dark-gold disabled:opacity-60"
                  disabled={loadingConfig}
                >
                  {loadingConfig ? '確認中…' : '再確認'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    !lineConfig
                      ? 'bg-gray-50 border-gray-200'
                      : lineConfig.receivingEnabled
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  受信(保存): {lineConfig ? (lineConfig.receivingEnabled ? 'ON' : 'OFF') : '未確認'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    !lineConfig
                      ? 'bg-gray-50 border-gray-200'
                      : lineConfig.sendingEnabled
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  送信: {lineConfig ? (lineConfig.sendingEnabled ? 'ON' : 'OFF') : '未確認'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    !lineConfig
                      ? 'bg-gray-50 border-gray-200'
                      : lineConfig.firebaseAdminConfigured
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  Firebase(Admin): {lineConfig ? (lineConfig.firebaseAdminConfigured ? 'OK' : 'NG') : '未確認'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    !lineConfig
                      ? 'bg-gray-50 border-gray-200'
                      : lineConfig.storageBucketConfigured
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                  title={lineConfig?.storageBucket ? `Bucket: ${lineConfig.storageBucket}` : undefined}
                >
                  Storage: {lineConfig ? (lineConfig.storageBucketConfigured ? 'OK' : 'NG') : '未確認'}
                </span>
              </div>
              {lineConfig?.storageBucket && (
                <div className="mt-2 text-[11px] text-gray-500">
                  Storage Bucket: <code className="bg-white border rounded px-1 py-0.5">{lineConfig.storageBucket}</code>
                </div>
              )}
              {webhookUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Webhook URL:</span>
                  <code className="text-[11px] bg-white border rounded px-2 py-0.5 break-all">{webhookUrl}</code>
                  <button type="button" onClick={() => void copyWebhookUrl()} className="text-[11px] text-primary hover:text-dark-gold">
                    コピー
                  </button>
                </div>
              )}
              {lineConfig && !lineConfig.channelSecretConfigured && (
                <p className="mt-2 text-[11px] text-gray-500">
                  `LINE_CHANNEL_SECRET` が未設定のため、新規メッセージの取り込み（Webhook保存）ができません。
                </p>
              )}
              {lineConfig && !lineConfig.accessTokenConfigured && (
                <p className="mt-1 text-[11px] text-gray-500">
                  `LINE_CHANNEL_ACCESS_TOKEN` が未設定のため、送信とプロフィール取得ができません（閲覧/紐付けは可能）。
                </p>
              )}
            </div>

            {selectedUserId && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-600">対応ステータス</label>
                <select
                  value={selectedConversation?.status ?? 'open'}
                  onChange={(e) => void handleUpdateStatus(e.target.value as LineConversation['status'])}
                  disabled={statusUpdating}
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white disabled:bg-gray-100"
                >
                  <option value="open">未対応</option>
                  <option value="pending">対応中</option>
                  <option value="closed">対応済</option>
                </select>
                <button
                  type="button"
                  onClick={downloadConversationCsv}
                  disabled={messages.length === 0}
                  className="ml-auto text-xs text-primary hover:text-dark-gold disabled:opacity-50"
                >
                  CSV出力
                </button>
              </div>
            )}

            {selectedUserId && (
              <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">メモ</p>
                  <button
                    type="button"
                    onClick={() => void handleSaveNote()}
                    disabled={noteSaving}
                    className="text-xs text-primary hover:text-dark-gold disabled:opacity-60"
                  >
                    {noteSaving ? '保存中…' : '保存'}
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="mt-2 w-full min-h-[64px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="対応メモ、注意点、次回アクションなど…"
                />
                <p className="text-[11px] text-gray-500 mt-2">
                  メモは会話（lineConversations）に保存され、他の管理者にも共有されます。
                </p>
              </div>
            )}

            {selectedUserId && (
              <div className="mt-4 rounded-lg border bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">顧客紐付け</p>
                  {selectedConversation?.customerId && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/customers/${selectedConversation.customerId}`)}
                        className="text-xs text-primary hover:text-dark-gold"
                      >
                        顧客詳細
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUnlinkCustomer()}
                        disabled={linking}
                        className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-60"
                      >
                        {linking ? '解除中…' : '解除'}
                      </button>
                    </div>
                  )}
                </div>

                  {selectedConversation?.customerId ? (
                    <div className="mt-2 text-sm text-gray-700">
                      <p className="font-medium">
                        {selectedConversation.customerName?.trim()
                          ? selectedConversation.customerName
                          : selectedConversation.customerId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedConversation.customerEmail ?? ''}
                        {(selectedConversation.customerEmail && selectedConversation.customerPhone) ? ' / ' : ''}
                        {selectedConversation.customerPhone ?? ''}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={customerQuery}
                          onChange={(e) => setCustomerQuery(e.target.value)}
                          disabled={linking}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                          placeholder="顧客名/電話/メール/IDで検索…"
                        />
                        {customerSearching && <span className="text-xs text-gray-500">検索中…</span>}
                      </div>

                      {customerCandidates.length > 0 && (
                        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-white">
                          {customerCandidates.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-3 p-3 border-b last:border-b-0">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name || c.id}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {c.email}
                                  {(c.email && c.phone) ? ' / ' : ''}
                                  {c.phone}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">ID: {c.id}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleLinkCustomer(c.id)}
                                disabled={linking}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-dark-gold disabled:opacity-50"
                              >
                                {linking ? '処理中…' : 'リンク'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500 mt-2">
                        紐付けすると、この会話から顧客詳細へすぐ移動できます（LINE userId で管理）。
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
              {!selectedUserId ? (
                <div className="text-sm text-gray-600">左の一覧から会話を選択してください。</div>
              ) : loadingDetail ? (
                <div className="text-sm text-gray-600">読み込み中…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-600">メッセージがありません。</div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.direction === 'out'
                  return (
                    <div key={m.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isOutbound ? 'bg-primary text-white' : 'bg-white text-gray-900'
                        }`}
                      >
                        {renderMessageBody(m, isOutbound)}
                        <div className={`mt-1 text-[11px] ${isOutbound ? 'text-white/80' : 'text-gray-400'}`}>
                          {formatTime(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t bg-white">
              <div className="flex items-center gap-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!selectedUserId || sending || sendingMedia || !sendingEnabled}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  placeholder={
                    !selectedUserId
                      ? '会話を選択してください'
                      : sendingEnabled
                        ? 'メッセージを入力（送信は任意機能）'
                        : '送信は未設定（LINE_CHANNEL_ACCESS_TOKEN が必要です）'
                  }
                />
                <label className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  添付
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    disabled={!selectedUserId || sendingMedia || !sendingEnabled}
                    onChange={(e) => handlePickAttachment(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    !selectedUserId ||
                    sending ||
                    sendingMedia ||
                    draft.trim().length === 0 ||
                    !sendingEnabled
                  }
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-dark-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? '送信中…' : '送信'}
                </button>
              </div>
              {attachment && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="min-w-0">
                      <span className="font-medium">添付:</span>{' '}
                      <span className="truncate">{attachment.name}</span>
                      {attachment.type.startsWith('video/') ? (
                        <span className="ml-2 text-[11px] text-gray-500">（動画はプレビュー画像が必要）</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-[11px] text-gray-600 hover:text-gray-900 disabled:opacity-60"
                        onClick={resetAttachment}
                        disabled={sendingMedia}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-dark-gold disabled:opacity-50"
                        onClick={() => void handleSendAttachment()}
                        disabled={sendingMedia || (attachment.type.startsWith('video/') && !attachmentPreview)}
                        title={
                          attachment.type.startsWith('video/') && !attachmentPreview
                            ? '動画送信にはプレビュー画像が必要です'
                            : undefined
                        }
                      >
                        {sendingMedia ? '送信中…' : '添付を送信'}
                      </button>
                    </div>
                  </div>
                  {attachment.type.startsWith('video/') && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-white cursor-pointer">
                          プレビュー画像を選択
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={sendingMedia}
                            onChange={(e) => setAttachmentPreview(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        {attachmentPreview ? (
                          <span className="text-[11px] text-gray-500 truncate">{attachmentPreview.name}</span>
                        ) : (
                          <span className="text-[11px] text-amber-700">未選択</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-2">
                送信機能は `LINE_CHANNEL_ACCESS_TOKEN` 設定時のみ動作します。
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
