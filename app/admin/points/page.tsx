'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { POINTS_PROGRAM_ENABLED } from '@/lib/constants/featureFlags'
import { apiClient, type AdminPointSummary, type AdminPointTransactionRecord } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'

import type { PointTransaction } from '@/lib/types'

type TransactionMode = 'add' | 'use'

type FeedbackState = { type: 'success' | 'error'; message: string } | null

type LoadOptions = {
  silent?: boolean
}

const asPointSummary = (record: Record<string, unknown>): AdminPointSummary => {
  return {
    userId: String(record.id ?? record.userId ?? ''),
    userName: typeof record.name === 'string' ? record.name : '',
    userEmail: typeof record.email === 'string' ? record.email : '',
    userPhone: typeof record.phone === 'string' ? record.phone : undefined,
    currentPoints: typeof record.points === 'number' ? record.points : Number(record.currentPoints ?? 0) || 0,
    lifetimePoints:
      typeof record.lifetimePoints === 'number'
        ? record.lifetimePoints
        : Number(record.lifetimePoints ?? 0) || 0,
    tier:
      typeof record.tier === 'string' && ['bronze', 'silver', 'gold', 'platinum'].includes(record.tier as string)
        ? (record.tier as AdminPointSummary['tier'])
        : 'bronze',
    tierExpiry: undefined,
  }
}

const createFallbackHistory = (entries: unknown[]): AdminPointTransactionRecord[] =>
  entries
    .map((entry) => {
      const record = entry as Record<string, unknown>
      const amount = typeof record.amount === 'number' ? record.amount : Number(record.amount ?? 0) || 0
      const timestamp = record.createdAt
      const createdAt =
        timestamp instanceof Date
          ? timestamp.toISOString()
          : typeof timestamp === 'string'
            ? new Date(timestamp).toISOString()
            : new Date().toISOString()

      const type =
        typeof record.type === 'string' && record.type.trim().length > 0
          ? (record.type as PointTransaction['type'])
          : amount >= 0
            ? 'earned'
            : 'redeemed'

      return {
        id: String(record.id ?? record.referenceId ?? createdAt),
        userId: String(record.userId ?? ''),
        amount,
        balance: typeof record.balance === 'number' ? record.balance : undefined,
        type,
        description: typeof record.description === 'string' ? record.description : undefined,
        reason: typeof record.reason === 'string' ? record.reason : undefined,
        referenceId: typeof record.referenceId === 'string' ? record.referenceId : undefined,
        createdAt,
      }
    })
    .filter((transaction) => transaction.userId)

const formatNumber = (value: number) => value.toLocaleString('ja-JP')

export default function PointsManagementPage() {
  if (!POINTS_PROGRAM_ENABLED) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-gray-900">ポイント管理</h1>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">
            2025年10月10日をもってポイント制度を終了しました。既存の履歴・残高は参考情報として保持していますが、追加・調整はできません。
          </p>
          <p className="text-sm text-gray-700 mt-3">
            お客様へのご案内やキャンセル対応は、顧客管理および予約管理ページをご利用ください。
          </p>
        </div>
      </div>
    )
  }
  const router = useRouter()
  const { user } = useAuth()

  const [summaries, setSummaries] = useState<AdminPointSummary[]>([])
  const [pointHistory, setPointHistory] = useState<AdminPointTransactionRecord[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<AdminPointSummary | null>(null)
  const [pointAmount, setPointAmount] = useState('')
  const [pointReason, setPointReason] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionMode>('add')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isFallbackData, setIsFallbackData] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 4000)
  }, [])

  const actionsDisabled = isFallbackData

  const loadData = useCallback(
    async (options: LoadOptions = {}) => {
      if (!user || user.role !== 'admin') return

      if (options.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        setIsFallbackData(false)
        setErrorMessage(null)

        const response = await apiClient.getAdminPoints()

        if (!response.success) {
          throw new Error('Failed to load admin points')
        }

        setSummaries(response.points ?? [])
        setPointHistory(response.transactions ?? [])
      } catch (error) {
        console.error('Failed to load points data:', error)

        const fallbackCustomers = storageService.getAllCustomers()
        const fallbackSummaries = fallbackCustomers.map((customer) => asPointSummary(customer as unknown as Record<string, unknown>))
        setSummaries(fallbackSummaries)

        try {
          const localTransactions = JSON.parse(
            typeof window !== 'undefined' ? localStorage.getItem('points') ?? '[]' : '[]',
          ) as unknown[]
          setPointHistory(createFallbackHistory(localTransactions))
        } catch {
          setPointHistory([])
        }

        setIsFallbackData(true)
        setErrorMessage('Firestoreからポイントデータを取得できなかったため、ローカルの参考データを表示しています。')
        setShowAddModal(false)
        setSelectedCustomer(null)
      } finally {
        if (options.silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [user],
  )

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    loadData()
  }, [user, router, loadData])

  const filteredSummaries = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return summaries

    return summaries.filter((summary) => {
      return (
        summary.userName.toLowerCase().includes(keyword) ||
        summary.userEmail.toLowerCase().includes(keyword) ||
        (summary.userPhone ?? '').includes(keyword)
      )
    })
  }, [summaries, searchTerm])

  const totalIssuedPoints = useMemo(
    () => pointHistory.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0),
    [pointHistory],
  )

  const totalUsedPoints = useMemo(
    () => Math.abs(pointHistory.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0)),
    [pointHistory],
  )

  const totalBalance = useMemo(
    () => summaries.reduce((sum, summary) => sum + summary.currentPoints, 0),
    [summaries],
  )

  const averageBalance = useMemo(() => {
    if (summaries.length === 0) return 0
    return Math.round(totalBalance / summaries.length)
  }, [summaries.length, totalBalance])

  const requireLiveData = (actionLabel?: string) => {
    if (!isFallbackData) {
      return true
    }

    const message = actionLabel
      ? `${actionLabel}を行う前に Firestore との接続を復旧し、「再読込」を実行してください。`
      : 'Firestore との接続を復旧し、「再読込」を実行してください。'
    alert(message)
    return false
  }

  const openModal = () => {
    if (!requireLiveData('ポイント調整')) {
      return
    }
    setSelectedCustomer(null)
    setPointAmount('')
    setPointReason('')
    setTransactionType('add')
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setSelectedCustomer(null)
    setPointAmount('')
    setPointReason('')
    setTransactionType('add')
  }

  const handleSelectCustomer = (summary: AdminPointSummary) => {
    if (!requireLiveData('顧客の選択')) {
      return
    }
    setSelectedCustomer(summary)
  }

  const handleNavigateToCustomer = (customerId: string) => {
    if (!requireLiveData('顧客詳細の表示')) {
      return
    }
    router.push(`/admin/customers/${customerId}`)
  }

  const handlePointTransaction = async () => {
    if (!requireLiveData('ポイント処理')) {
      return
    }

    if (!selectedCustomer) {
      alert('顧客を選択してください')
      return
    }

    const amountValue = Number(pointAmount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      alert('有効なポイント数を入力してください')
      return
    }

    if (!pointReason.trim()) {
      alert('ポイントの理由を入力してください')
      return
    }

    if (transactionType === 'use' && amountValue > selectedCustomer.currentPoints) {
      alert('使用ポイントが保有ポイントを超えています')
      return
    }

    try {
      setModalSubmitting(true)
      const response = await apiClient.adjustAdminPoints({
        userId: selectedCustomer.userId,
        amount: amountValue,
        description: pointReason.trim(),
        mode: transactionType,
      })

      if (!response.success) {
        throw new Error('ポイントの処理に失敗しました')
      }

      setSummaries((prev) => {
        const next = prev.some((summary) => summary.userId === response.summary.userId)
          ? prev.map((summary) => (summary.userId === response.summary.userId ? response.summary : summary))
          : [...prev, response.summary]
        return next.sort((a, b) => a.userName.localeCompare(b.userName, 'ja'))
      })

      setPointHistory((prev) => [response.transaction, ...prev].slice(0, 100))

      showFeedback('success', response.message ?? 'ポイントを更新しました')
      closeModal()
    } catch (error) {
      console.error('Failed to update points:', error)
      alert(error instanceof Error ? error.message : 'ポイントの更新に失敗しました')
    } finally {
      setModalSubmitting(false)
      void loadData({ silent: true })
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-600">読み込み中です…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">ポイント管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            顧客の保有ポイントと履歴を確認し、必要に応じて付与・減算を行います。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadData({ silent: true })}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={refreshing}
          >
            {refreshing ? '再読込中…' : '再読込'}
          </button>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            disabled={isFallbackData}
            title={isFallbackData ? '参考用データ表示中はポイント調整を実行できません' : undefined}
          >
            ポイント調整
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMessage}
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総発行ポイント</p>
          <p className="text-2xl font-bold text-green-600">{formatNumber(totalIssuedPoints)}pt</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総使用ポイント</p>
          <p className="text-2xl font-bold text-red-600">{formatNumber(totalUsedPoints)}pt</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">現在の総ポイント</p>
          <p className="text-2xl font-bold text-primary">{formatNumber(totalBalance)}pt</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">平均保有ポイント</p>
          <p className="text-2xl font-bold">{formatNumber(averageBalance)}pt</p>
        </div>
      </div>

      {/* ポイント履歴テーブル */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">ポイント履歴</h2>
          <span className="text-sm text-gray-500">最新100件を表示</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ポイント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  理由
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  残高
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pointHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    ポイント履歴がありません
                  </td>
                </tr>
              ) : (
                pointHistory.map((transaction) => {
                  const customer = summaries.find((summary) => summary.userId === transaction.userId)
                  const balance = transaction.balance ?? customer?.currentPoints ?? 0

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm">
                          {new Date(transaction.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleTimeString('ja-JP')}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer ? (
                          <button
                            onClick={() => handleNavigateToCustomer(customer.userId)}
                            className={`text-sm ${
                              actionsDisabled
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-primary hover:text-dark-gold'
                            }`}
                            disabled={actionsDisabled}
                          >
                            {customer.userName}
                          </button>
                        ) : (
                          <span className="text-gray-500">不明</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.amount >= 0
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {transaction.amount >= 0 ? '獲得' : '使用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatNumber(transaction.amount)}pt
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {transaction.reason || transaction.description || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium">{formatNumber(balance)}pt</p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ポイント調整モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">ポイント{transactionType === 'add' ? '付与' : '使用'}</h3>

            {!selectedCustomer ? (
              <div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="顧客名、メール、電話番号で検索"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  {filteredSummaries.map((summary) => (
                    <button
                      key={summary.userId}
                      onClick={() => handleSelectCustomer(summary)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 disabled:bg-gray-100 disabled:text-gray-400"
                      disabled={actionsDisabled}
                    >
                      <p className="font-medium">{summary.userName}</p>
                      <p className="text-xs text-gray-500">
                        {summary.userEmail} / 現在: {formatNumber(summary.currentPoints)}pt
                      </p>
                    </button>
                  ))}
                  {filteredSummaries.length === 0 && (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">該当する顧客が見つかりません</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{selectedCustomer.userName}</p>
                  <p className="text-sm text-gray-600">
                    現在のポイント: {formatNumber(selectedCustomer.currentPoints)}pt
                  </p>
                </div>

                <fieldset className="mb-4">
                  <legend className="block text-sm font-medium text-gray-700 mb-1">タイプ</legend>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTransactionType('add')}
                      className={`flex-1 px-4 py-2 rounded-md ${
                        transactionType === 'add'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      disabled={modalSubmitting}
                    >
                      ポイント付与
                    </button>
                    <button
                      onClick={() => setTransactionType('use')}
                      className={`flex-1 px-4 py-2 rounded-md ${
                        transactionType === 'use'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      disabled={modalSubmitting}
                    >
                      ポイント使用
                    </button>
                  </div>
                </fieldset>

                <div className="mb-4">
                  <label htmlFor="point-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    ポイント数
                  </label>
                  <input
                    id="point-amount"
                    type="number"
                    value={pointAmount}
                    onChange={(event) => setPointAmount(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="100"
                    min={1}
                    max={transactionType === 'use' ? selectedCustomer.currentPoints : undefined}
                    disabled={modalSubmitting}
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="point-reason" className="block text-sm font-medium text-gray-700 mb-1">
                    理由
                  </label>
                  <textarea
                    id="point-reason"
                    value={pointReason}
                    onChange={(event) => setPointReason(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder={transactionType === 'add' ? '誕生日特典' : 'サービス利用'}
                    disabled={modalSubmitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePointTransaction}
                    className={`flex-1 px-4 py-2 rounded-md text-white ${
                      transactionType === 'add'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting
                      ? '処理中…'
                      : transactionType === 'add'
                        ? 'ポイント付与'
                        : 'ポイント使用'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                    disabled={modalSubmitting}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
