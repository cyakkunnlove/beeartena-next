'use client'

import { CakeIcon, GiftIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import { apiClient } from '@/lib/api/client'
import { storageService } from '@/lib/storage/storageService'
import { Customer } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

interface BirthdayBatchResults {
  checked: number
  granted: number
  errors: number
}

type BirthdayBatchResponse = {
  results?: BirthdayBatchResults
  error?: string
}

const isBirthdayBatchResults = (value: unknown): value is BirthdayBatchResults => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Partial<BirthdayBatchResults>
  return (
    typeof record.checked === 'number' &&
    typeof record.granted === 'number' &&
    typeof record.errors === 'number'
  )
}

const parseBirthdayBatchResponse = (value: unknown): BirthdayBatchResponse => {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const record = value as Record<string, unknown>
  const rawResults = record.results
  const results = isBirthdayBatchResults(rawResults) ? rawResults : undefined
  const error = typeof record.error === 'string' ? record.error : undefined

  return { results, error }
}

export default function BirthdayManagementPage() {
  const { user: currentUser } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [processingBatch, setProcessingBatch] = useState(false)
  const [batchResults, setBatchResults] = useState<BirthdayBatchResults | null>(null)
  const [filter, setFilter] = useState<'all' | 'today' | 'thisMonth'>('all')
  const [isFallbackData, setIsFallbackData] = useState(false)

  const sortCustomersByBirthday = useCallback((records: Customer[]) => {
    return [...records].sort((a, b) => {
      if (!a.birthday && !b.birthday) return 0
      if (!a.birthday) return 1
      if (!b.birthday) return -1

      const [, aMonth, aDay] = a.birthday.split('-').map(Number)
      const [, bMonth, bDay] = b.birthday.split('-').map(Number)

      if (aMonth !== bMonth) return aMonth - bMonth
      return aDay - bDay
    })
  }, [])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setIsFallbackData(false)

    try {
      const aggregated = new Map<string, Customer>()
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

        response.customers.forEach((customer) => {
          aggregated.set(customer.id, customer)
        })

        if (!response.hasNext || !response.cursor) {
          break
        }
        cursor = response.cursor ?? undefined
      }

      const sorted = sortCustomersByBirthday(Array.from(aggregated.values()))
      setCustomers(sorted)
      storageService.replaceCustomers(sorted)
    } catch (error: unknown) {
      logger.error('Failed to fetch customers', { error })
      const fallback = storageService.getAllCustomers()
      const sorted = sortCustomersByBirthday(fallback)
      setCustomers(sorted)
      setIsFallbackData(true)
    } finally {
      setLoading(false)
    }
  }, [sortCustomersByBirthday])

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      void fetchCustomers()
    }
  }, [currentUser, fetchCustomers])

  const runBirthdayBatch = useCallback(async () => {
    setProcessingBatch(true)
    setBatchResults(null)

    try {
      const response = await apiClient.runAdminBirthdayBatch()
      const { results, error } = parseBirthdayBatchResponse(response)

      if (results) {
        setBatchResults(results)
        await fetchCustomers()
      } else {
        alert(error ?? response?.message ?? 'バッチ処理に失敗しました')
      }
    } catch (error: unknown) {
      logger.error('Batch process error', { error })
      alert('バッチ処理中にエラーが発生しました')
    } finally {
      setProcessingBatch(false)
    }
  }, [fetchCustomers])

  const formatBirthday = (birthday: string) => {
    const [_year, month, day] = birthday.split('-')
    return `${month}月${day}日`
  }

  const getAge = (birthday: string) => {
    const [year, month, day] = birthday.split('-').map(Number)
    const birthDate = new Date(year, month - 1, day)
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  const isBirthdayToday = (birthday: string) => {
    const today = new Date()
    const [, month, day] = birthday.split('-').map(Number)
    return month === today.getMonth() + 1 && day === today.getDate()
  }

  const filteredCustomers = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    return customers.filter((user) => {
      if (!user.birthday) return false

      const [, month, day] = user.birthday.split('-').map(Number)

      if (Number.isNaN(month) || Number.isNaN(day)) {
        return false
      }

      switch (filter) {
        case 'today':
          return month === currentMonth && day === currentDay
        case 'thisMonth':
          return month === currentMonth
        default:
          return true
      }
    })
  }, [customers, filter])

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="text-center py-8">アクセス権限がありません</div>
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">誕生日管理</h1>
        <button
          onClick={runBirthdayBatch}
          disabled={processingBatch}
          className="btn btn-primary flex items-center gap-2"
        >
          <GiftIcon className="h-5 w-5" />
          {processingBatch ? '処理中...' : '誕生日ポイント一括処理'}
        </button>
      </div>

      {isFallbackData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
          Firestoreから顧客データを取得できなかったため、ローカルキャッシュの情報を表示しています。
        </div>
      )}

      {batchResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">バッチ処理結果</h3>
          <p>チェック: {batchResults.checked}人</p>
          <p>ポイント付与: {batchResults.granted}人</p>
          {batchResults.errors > 0 && (
            <p className="text-red-600">エラー: {batchResults.errors}件</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            全て ({customers.filter((u) => u.birthday).length})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded ${
              filter === 'today' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今日 ({customers.filter((u) => u.birthday && isBirthdayToday(u.birthday)).length})
          </button>
          <button
            onClick={() => setFilter('thisMonth')}
            className={`px-4 py-2 rounded ${
              filter === 'thisMonth' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今月 (
            {
              customers.filter((u) => {
                if (!u.birthday) return false
                const [, month] = u.birthday.split('-').map(Number)
                return month === new Date().getMonth() + 1
              }).length
            }
            )
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  誕生日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  年齢
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  今年のポイント付与
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((user) => {
                if (!user.birthday) {
                  return null
                }

                const isToday = isBirthdayToday(user.birthday)

                return (
                  <tr key={user.id} className={isToday ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {isToday && <CakeIcon className="h-5 w-5 text-yellow-500 mr-2" />}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatBirthday(user.birthday)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {`${getAge(user.birthday)}歳`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.lastBirthdayPointsYear === new Date().getFullYear() ? (
                        <span className="text-green-600 font-medium">付与済み</span>
                      ) : (
                        <span className="text-gray-500">未付与</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isToday && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          本日誕生日
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-gray-500">該当するユーザーがいません</div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">誕生日ポイントについて</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 誕生日当日に1,000ポイントが自動付与されます</li>
          <li>• 1年に1回のみ付与されます</li>
          <li>• 手動でバッチ処理を実行することも可能です</li>
          <li>• 誕生日が登録されていないユーザーは対象外です</li>
        </ul>
      </div>
    </div>
  )
}
