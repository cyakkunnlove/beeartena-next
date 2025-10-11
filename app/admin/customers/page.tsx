'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import CustomerDeleteModal from '@/components/admin/CustomerDeleteModal'
import CustomerDetailModal from '@/components/admin/CustomerDetailModal'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { Customer } from '@/lib/types'

export default function AdminCustomers() {
  const router = useRouter()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isFallbackData, setIsFallbackData] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const PAGE_SIZE = 20

  const normalizeCustomerDates = (records: Customer[]): Customer[] =>
    records.map((item) => ({
      ...item,
      createdAt:
        item.createdAt instanceof Date
          ? item.createdAt
          : item.createdAt
            ? new Date(item.createdAt)
            : new Date(),
      updatedAt:
        item.updatedAt instanceof Date
          ? item.updatedAt
          : item.updatedAt
            ? new Date(item.updatedAt)
            : new Date(),
    }))

  const loadCustomers = useCallback(
    async (
      options: {
        cursor?: string | null
        append?: boolean
        silent?: boolean
      } = {},
    ) => {
      if (!user || user.role !== 'admin') {
        return
      }

      if (options.append) {
        setLoadingMore(true)
      } else if (options.silent) {
        setRefreshing(true)
      } else {
        setRefreshing(false)
      }

      try {
        setIsFallbackData(false)
        setErrorMessage(null)

        const response = await apiClient.getAdminCustomers({
          limit: PAGE_SIZE,
          cursor: options.cursor ?? undefined,
        })

        if (!response.success || !Array.isArray(response.customers)) {
          throw new Error('Failed to fetch customers')
        }

        const normalized = normalizeCustomerDates(response.customers)

        let nextState: Customer[] = []
        setCustomers((prev) => {
          const base = options.append ? prev : []
          const merged = [...base, ...normalized]
          const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
          deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          nextState = deduped
          return deduped
        })

        setNextCursor(response.cursor ?? null)
        setHasNextPage(Boolean(response.hasNext) && Boolean(response.cursor))

        try {
          storageService.replaceCustomers(nextState)
        } catch (storageError) {
          console.warn('Failed to persist customers to storage', storageError)
        }
      } catch (error) {
        console.error('Failed to load customers:', error)

        const localCustomers = normalizeCustomerDates(storageService.getAllCustomers() as Customer[])
        const sortedLocal = localCustomers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setCustomers((prev) => {
          const base = options.append ? prev : []
          const merged = [...base, ...sortedLocal]
          const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
          deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          return deduped
        })
        setIsFallbackData(true)
        setErrorMessage('Firestoreから顧客データを取得できなかったため、ローカルの参考データを表示しています。')
        setNextCursor(null)
        setHasNextPage(false)
      } finally {
        if (options.append) {
          setLoadingMore(false)
        } else {
          setRefreshing(false)
        }
      }
    },
    [user, PAGE_SIZE],
  )

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    void loadCustomers()
  }, [user, router, loadCustomers])

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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const rawPhoneTerm = searchTerm.trim()

  const filteredCustomers = customers.filter((customer) => {
    if (normalizedSearchTerm.length === 0 && rawPhoneTerm.length === 0) {
      return true
    }

    const nameMatch = customer.name.toLowerCase().includes(normalizedSearchTerm)
    const emailMatch = customer.email.toLowerCase().includes(normalizedSearchTerm)
    const phoneMatch = (customer.phone || '').includes(rawPhoneTerm)

    return normalizedSearchTerm.length > 0
      ? nameMatch || emailMatch || phoneMatch
      : phoneMatch
  })

  const getTierColor = (tier: string) => {
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

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'ブロンズ'
      case 'silver':
        return 'シルバー'
      case 'gold':
        return 'ゴールド'
      case 'platinum':
        return 'プラチナ'
      default:
        return tier
    }
  }

  const handleDeleteClick = (customer: Customer) => {
    if (!requireLiveData('顧客の削除')) {
      return
    }
    setSelectedCustomer(customer)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async (customerId: string) => {
    if (!requireLiveData('顧客の削除')) {
      setShowDeleteModal(false)
      return
    }

    try {
      await apiClient.deleteAdminCustomer(customerId)

      let nextCustomers: Customer[] = []
      setCustomers((prev) => {
        const updated = prev.filter((c) => c.id !== customerId)
        nextCustomers = updated
        return updated
      })

      try {
        storageService.replaceCustomers(nextCustomers)
      } catch (storageError) {
        console.warn('Failed to update cached customers after deletion', storageError)
      }

      setShowDeleteModal(false)
      setSelectedCustomer(null)
    } catch (error: unknown) {
      console.error('Failed to delete customer:', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : '顧客の削除に失敗しました'
      throw new Error(message)
    }
  }

  const handleShowDetail = (customer: Customer) => {
    setDetailCustomer(customer)
    setIsDetailModalOpen(true)
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const handleSendMail = (email: string) => {
    if (!requireLiveData('メール送信')) {
      return
    }
    window.location.href = `mailto:${email}`
  }

  const handleReload = () => {
    void loadCustomers({ silent: true })
  }

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) {
      return
    }
    void loadCustomers({ cursor: nextCursor, append: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">顧客管理</h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReload}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={refreshing}
              >
                {refreshing ? '更新中…' : '再読込'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="text-primary hover:text-dark-gold"
              >
                ← 管理画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <input
            type="text"
            placeholder="名前、メールアドレス、電話番号で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">総顧客数</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">ブロンズ会員</p>
            <p className="text-2xl font-bold">
              {customers.filter((c) => (c.tier || 'bronze') === 'bronze').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">シルバー会員</p>
            <p className="text-2xl font-bold">
              {customers.filter((c) => c.tier === 'silver').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">ゴールド会員以上</p>
            <p className="text-2xl font-bold">
              {customers.filter((c) => c.tier === 'gold' || c.tier === 'platinum').length}
            </p>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客情報
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    連絡先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会員ランク
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        旧ポイント残高
                      </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総利用額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      該当する顧客が見つかりません
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-500">ID: {customer.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm">{customer.email}</p>
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(customer.tier || 'bronze')}`}
                        >
                          {getTierName(customer.tier || 'bronze')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium">{(customer.points || 0).toLocaleString()}pt</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium">
                          ¥{(customer.totalSpent || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm">
                          {new Date(customer.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleShowDetail(customer)}
                            className="text-sm text-primary hover:text-dark-gold"
                          >
                            詳細
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendMail(customer.email)}
                            className={`text-sm ${
                              isFallbackData
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                            disabled={isFallbackData}
                          >
                            メール
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(customer)}
                            className={`text-sm ${
                              isFallbackData
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-800'
                            }`}
                            disabled={isFallbackData}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {hasNextPage && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore || isFallbackData}
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMore ? '読み込み中…' : 'さらに読み込む'}
            </button>
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      <CustomerDeleteModal
        isOpen={showDeleteModal}
        customer={selectedCustomer}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedCustomer(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      <CustomerDetailModal
        open={isDetailModalOpen && detailCustomer !== null}
        customer={detailCustomer}
        onClose={() => {
          setIsDetailModalOpen(false)
          setDetailCustomer(null)
        }}
        disableLiveRequests={isFallbackData}
      />
    </div>
  )
}
