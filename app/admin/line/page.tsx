'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'

import type { Customer, LineConversation, LineMessage } from '@/lib/types'

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

  const [conversations, setConversations] = useState<LineConversation[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<LineConversation | null>(null)
  const [messages, setMessages] = useState<LineMessage[]>([])

  const [search, setSearch] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [customerQuery, setCustomerQuery] = useState('')
  const [customerCandidates, setCustomerCandidates] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [linking, setLinking] = useState(false)

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
    void loadConversations()
  }, [authLoading, user, router, loadConversations])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter((c) => {
      const name = (c.displayName ?? '').toLowerCase()
      const last = (c.lastMessageText ?? '').toLowerCase()
      const id = (c.userId ?? '').toLowerCase()
      return name.includes(q) || last.includes(q) || id.includes(q)
    })
  }, [conversations, search])

  const selectedTitle = selectedConversation?.displayName?.trim()
    ? selectedConversation.displayName
    : selectedUserId
      ? `ユーザー: ${selectedUserId}`
      : '会話を選択してください'

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId)
    setCustomerQuery('')
    setCustomerCandidates([])
    void loadConversation(userId)
  }

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
      await apiClient.linkAdminLineConversationCustomer(selectedUserId, customerId)
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
      await apiClient.unlinkAdminLineConversationCustomer(selectedUserId)
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
                                  {c.displayName?.trim() ? c.displayName : c.userId}
                                  {c.customerId ? <span className="ml-1 text-xs text-gray-400">🔗</span> : null}
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
                          onClick={handleUnlinkCustomer}
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
                        <div className="whitespace-pre-wrap break-words">{m.text ?? `[${m.type}]`}</div>
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
                  disabled={!selectedUserId || sending}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  placeholder={selectedUserId ? 'メッセージを入力（送信は任意機能）' : '会話を選択してください'}
                />
                <button
                  type="submit"
                  disabled={!selectedUserId || sending || draft.trim().length === 0}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-dark-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? '送信中…' : '送信'}
                </button>
              </div>
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
