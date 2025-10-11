'use client'

import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import CustomerDeleteModal from '@/components/admin/CustomerDeleteModal'
import DatePicker from '@/components/ui/DatePicker'
import { useAuth } from '@/lib/auth/AuthContext'
import { apiClient } from '@/lib/api/client'
import { storageService } from '@/lib/storage/storageService'
import { Customer, Reservation, PointTransaction } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

const isReservationRecord = (value: unknown): value is Reservation => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Partial<Reservation>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    typeof record.time === 'string' &&
    typeof record.status === 'string'
  )
}

const isPointTransactionRecord = (value: unknown): value is PointTransaction => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Partial<PointTransaction>
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.type === 'string' &&
    typeof record.amount === 'number' &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
  )
}

const CUSTOMER_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const

type CustomerTier = (typeof CUSTOMER_TIERS)[number]

const isCustomerTier = (value: string | null | undefined): value is CustomerTier =>
  typeof value === 'string' && (CUSTOMER_TIERS as readonly string[]).includes(value)

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([])
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [selectedTier, setSelectedTier] = useState<CustomerTier>('bronze')
  const [activeTab, setActiveTab] = useState<'reservations' | 'points'>('reservations')
  const [editingBirthday, setEditingBirthday] = useState(false)
  const [birthday, setBirthday] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const customerId = useMemo(() => {
    const rawId = params.id
    if (Array.isArray(rawId)) {
      return rawId[0] ?? ''
    }
    return rawId ?? ''
  }, [params.id])

  const loadCustomerData = useCallback(
    async (targetCustomerId: string) => {
      const cachedCustomers = storageService.getAllCustomers()
      let provisionalCustomer =
        cachedCustomers.find((c) => c.id === targetCustomerId) ?? null

      if (provisionalCustomer) {
        setCustomer(provisionalCustomer)
        setNotes(provisionalCustomer.notes ?? '')
        setSelectedTier(
          isCustomerTier(provisionalCustomer.tier) ? provisionalCustomer.tier : 'bronze',
        )
        setBirthday(provisionalCustomer.birthday ?? '')
      } else {
        setCustomer(null)
        setNotes('')
        setSelectedTier('bronze')
        setBirthday('')
      }

      let refreshedCustomer: Customer | null = null
      try {
        const aggregated = new Map<string, Customer>()
        cachedCustomers.forEach((existing) => aggregated.set(existing.id, existing))

        const PAGE_SIZE = 100
        let cursor: string | undefined

        for (let page = 0; page < 50; page += 1) {
          const response = await apiClient.getAdminCustomers({
            limit: PAGE_SIZE,
            cursor,
          })

          if (!response.success) {
            throw new Error('顧客情報の取得に失敗しました')
          }

          response.customers.forEach((entry) => {
            aggregated.set(entry.id, entry)
            if (!refreshedCustomer && entry.id === targetCustomerId) {
              refreshedCustomer = entry
            }
          })

        if (!response.hasNext || !response.cursor || refreshedCustomer) {
          break
        }
        cursor = response.cursor ?? undefined
        }

        const mergedCustomers = Array.from(aggregated.values()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        )
        storageService.replaceCustomers(mergedCustomers)

        if (!refreshedCustomer) {
          refreshedCustomer =
            mergedCustomers.find((c) => c.id === targetCustomerId) ?? null
        }
      } catch (error: unknown) {
        logger.error('Failed to refresh customer from API', {
          customerId: targetCustomerId,
          error,
        })
      }

      const finalCustomer =
        refreshedCustomer ??
        storageService.getAllCustomers().find((c) => c.id === targetCustomerId) ??
        provisionalCustomer

      if (!finalCustomer) {
        router.push('/admin/customers')
        return
      }

      setCustomer(finalCustomer)
      setNotes(finalCustomer.notes ?? '')
      setSelectedTier(isCustomerTier(finalCustomer.tier) ? finalCustomer.tier : 'bronze')
      setBirthday(finalCustomer.birthday ?? '')

      let reservationsRaw: unknown = []
      try {
        reservationsRaw = JSON.parse(localStorage.getItem('reservations') ?? '[]')
      } catch (error: unknown) {
        logger.error('Failed to parse reservations from storage', {
          customerId: targetCustomerId,
          error,
        })
      }

      if (Array.isArray(reservationsRaw)) {
        const customerReservations = reservationsRaw
          .filter((reservation): reservation is Reservation => {
            if (!isReservationRecord(reservation)) {
              return false
            }
            return reservation.customerId === targetCustomerId
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setReservations(customerReservations)
      } else {
        setReservations([])
      }

      let pointsRaw: unknown = []
      try {
        pointsRaw = JSON.parse(localStorage.getItem('points') ?? '[]')
      } catch (error: unknown) {
        logger.error('Failed to parse points from storage', {
          customerId: targetCustomerId,
          error,
        })
      }

      if (Array.isArray(pointsRaw)) {
        const customerPoints = pointsRaw
          .filter((transaction): transaction is PointTransaction => {
            if (!isPointTransactionRecord(transaction)) {
              return false
            }
            return transaction.userId === targetCustomerId
          })
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        setPointHistory(customerPoints)
      } else {
        setPointHistory([])
      }
    },
    [router],
  )

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin')
      return
    }

    if (customerId) {
      void loadCustomerData(customerId)
    }
  }, [user, router, customerId, loadCustomerData])

  const handleNotesUpdate = async () => {
    if (!customer) return

    try {
      await apiClient.updateAdminCustomer(customer.id, { notes })
      const updatedCustomer: Customer = {
        ...customer,
        notes,
        updatedAt: new Date(),
      }
      setCustomer(updatedCustomer)
      storageService.updateCustomer(customer.id, updatedCustomer)
      setEditingNotes(false)
    } catch (error: unknown) {
      logger.error('Failed to update customer notes', {
        customerId: customer.id,
        error,
      })
      alert('顧客メモの更新に失敗しました')
    }
  }

  const handleTierUpdate = async () => {
    if (!customer) return

    try {
      await apiClient.updateAdminCustomer(customer.id, { tier: selectedTier })
      const updatedCustomer: Customer = {
        ...customer,
        tier: selectedTier,
        updatedAt: new Date(),
      }
      setCustomer(updatedCustomer)
      storageService.updateCustomer(customer.id, updatedCustomer)
    } catch (error: unknown) {
      logger.error('Failed to update customer tier', {
        customerId: customer.id,
        error,
      })
      alert('会員ランクの更新に失敗しました')
    }
  }

  const handleBirthdayUpdate = async () => {
    if (!customer) return

    try {
      await apiClient.updateAdminCustomer(customer.id, { birthday })
      const updatedCustomer: Customer = {
        ...customer,
        birthday,
        updatedAt: new Date(),
      }
      setCustomer(updatedCustomer)
      storageService.updateCustomer(customer.id, updatedCustomer)
      setEditingBirthday(false)
    } catch (error: unknown) {
      logger.error('Failed to update birthday', {
        customerId: customer.id,
        error,
      })
      alert('生年月日の更新に失敗しました')
    }
  }

  const handleDeleteConfirm = async (customerId: string) => {
    try {
      await apiClient.deleteAdminCustomer(customerId)
      const remaining = storageService
        .getAllCustomers()
        .filter((record) => record.id !== customerId)
      storageService.replaceCustomers(remaining)
      router.push('/admin/customers')
    } catch (error: unknown) {
      logger.error('Failed to delete customer', {
        customerId,
        error,
      })
      throw error instanceof Error ? error : new Error('顧客の削除に失敗しました')
    }
  }

  const calculateStats = () => {
    const completedReservations = reservations.filter((r) => r.status === 'completed')
    const totalSpent = completedReservations.reduce((sum, r) => sum + (r.price || 0), 0)
    const visitCount = completedReservations.length
    const averageSpent = visitCount > 0 ? Math.round(totalSpent / visitCount) : 0

    return { totalSpent, visitCount, averageSpent }
  }

  if (!user || user.role !== 'admin' || !customer) {
    return null
  }

  const stats = calculateStats()

  const _getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'text-orange-600 bg-orange-50'
      case 'silver':
        return 'text-gray-600 bg-gray-50'
      case 'gold':
        return 'text-yellow-600 bg-yellow-50'
      case 'platinum':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'confirmed':
        return 'text-blue-600 bg-blue-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'confirmed':
        return '確定'
      case 'pending':
        return '承認待ち'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/customers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          顧客一覧に戻る
        </button>
      </div>

      {/* 顧客基本情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{customer.name}</h1>
            <p className="text-gray-600">ID: {customer.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTier}
              onChange={(event) => {
                const value = event.target.value
                if (isCustomerTier(value)) {
                  setSelectedTier(value)
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="bronze">ブロンズ</option>
              <option value="silver">シルバー</option>
              <option value="gold">ゴールド</option>
              <option value="platinum">プラチナ</option>
            </select>
            <button
              onClick={handleTierUpdate}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold"
            >
              ティア更新
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              顧客削除
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">メールアドレス</p>
            <p className="font-medium">{customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">電話番号</p>
            <p className="font-medium">{customer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">生年月日</p>
            <div className="flex items-center gap-2">
              {editingBirthday ? (
                <div className="flex items-center gap-2">
                  <DatePicker value={birthday} onChange={setBirthday} required />
                  <button
                    onClick={handleBirthdayUpdate}
                    className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-dark-gold"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setBirthday(customer?.birthday ?? '')
                      setEditingBirthday(false)
                    }}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-medium">
                    {birthday ? new Date(birthday).toLocaleDateString('ja-JP') : '未設定'}
                  </p>
                  <button
                    onClick={() => setEditingBirthday(true)}
                    className="text-sm text-primary hover:text-dark-gold"
                  >
                    編集
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">登録日</p>
            <p className="font-medium">
              {new Date(customer.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>

        {/* メモ */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">顧客メモ</p>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-sm text-primary hover:text-dark-gold"
              >
                編集
              </button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="顧客に関するメモを入力..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleNotesUpdate}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setNotes(customer.notes || '')
                    setEditingNotes(false)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{notes || '（メモなし）'}</p>
          )}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">現在のポイント</p>
          <p className="text-2xl font-bold text-primary">
            {(customer.points || 0).toLocaleString()}pt
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総利用額</p>
          <p className="text-2xl font-bold">¥{stats.totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">来店回数</p>
          <p className="text-2xl font-bold">{stats.visitCount}回</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">平均利用額</p>
          <p className="text-2xl font-bold">¥{stats.averageSpent.toLocaleString()}</p>
        </div>
      </div>

      {/* タブ */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'reservations'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              予約履歴 ({reservations.length})
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'points'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ポイント履歴 ({pointHistory.length})
            </button>
          </nav>
        </div>

        {/* 予約履歴 */}
        {activeTab === 'reservations' && (
          <div className="p-6">
            {reservations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">予約履歴がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="pb-3">日時</th>
                      <th className="pb-3">サービス</th>
                      <th className="pb-3">金額</th>
                      <th className="pb-3">ステータス</th>
                      <th className="pb-3">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-t">
                        <td className="py-3">
                          <p>{new Date(reservation.date).toLocaleDateString('ja-JP')}</p>
                          <p className="text-sm text-gray-500">{reservation.time}</p>
                        </td>
                        <td className="py-3">{reservation.serviceName}</td>
                        <td className="py-3">¥{reservation.price.toLocaleString()}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}
                          >
                            {getStatusText(reservation.status)}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => router.push(`/admin/reservations/${reservation.id}`)}
                            className="text-sm text-primary hover:text-dark-gold"
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ポイント履歴 */}
        {activeTab === 'points' && (
          <div className="p-6">
            {pointHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">ポイント履歴がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="pb-3">日時</th>
                      <th className="pb-3">タイプ</th>
                      <th className="pb-3">ポイント</th>
                      <th className="pb-3">理由</th>
                      <th className="pb-3">残高</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointHistory.map((transaction, index) => {
                      // 残高を計算（最新から過去に向かって）
                      let balance = customer?.points || 0
                      for (let i = 0; i < index; i++) {
                        balance -= pointHistory[i].amount
                      }

                      return (
                        <tr key={transaction.id} className="border-t">
                          <td className="py-3">
                            <p>{new Date(transaction.createdAt).toLocaleDateString('ja-JP')}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleTimeString('ja-JP')}
                            </p>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.type === 'earned'
                                  ? 'text-green-600 bg-green-50'
                                  : transaction.type === 'redeemed'
                                    ? 'text-red-600 bg-red-50'
                                    : 'text-gray-600 bg-gray-50'
                              }`}
                            >
                              {transaction.type === 'earned'
                                ? '獲得'
                                : transaction.type === 'redeemed'
                                  ? '使用'
                                  : '失効'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`font-medium ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.amount > 0 ? '+' : ''}
                              {transaction.amount.toLocaleString()}pt
                            </span>
                          </td>
                          <td className="py-3">{transaction.reason}</td>
                          <td className="py-3 font-medium">{balance.toLocaleString()}pt</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      <CustomerDeleteModal
        isOpen={showDeleteModal}
        customer={customer}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
