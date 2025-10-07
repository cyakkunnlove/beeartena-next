'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import CustomerDeleteModal from '@/components/admin/CustomerDeleteModal'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { userService } from '@/lib/firebase/users'
import { storageService } from '@/lib/storage/storageService'
import { Customer } from '@/lib/types'

export default function AdminCustomers() {
  const router = useRouter()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    loadCustomers()
  }, [user, router])

  const loadCustomers = async () => {
    try {
      const data = await apiClient.getAdminCustomers()

      if (!data?.success || !Array.isArray(data.customers)) {
        throw new Error('Invalid response format')
      }

      setCustomers(
        data.customers
          .map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      )
    } catch (error) {
      console.error('Failed to load customers:', error)
      // フォールバック: LocalStorageから取得
      const localCustomers = storageService.getAllCustomers()
      setCustomers(
        localCustomers.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      )
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm),
  )

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
    setSelectedCustomer(customer)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async (customerId: string) => {
    try {
      await userService.deleteCustomerByAdmin(customerId)
      // ローカルの顧客リストからも削除
      setCustomers(customers.filter(c => c.id !== customerId))
      setShowDeleteModal(false)
      setSelectedCustomer(null)
    } catch (error: any) {
      console.error('Failed to delete customer:', error)
      throw error
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">顧客管理</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-primary hover:text-dark-gold"
            >
              ← 管理画面に戻る
            </button>
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
                    ポイント
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/customers/${customer.id}`)}
                            className="text-primary hover:text-dark-gold text-sm"
                          >
                            詳細
                          </button>
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            メール
                          </a>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="text-red-600 hover:text-red-800 text-sm"
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
    </div>
  )
}
