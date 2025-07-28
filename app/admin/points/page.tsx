'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { Customer, PointTransaction } from '@/lib/types'


export default function PointsManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [pointAmount, setPointAmount] = useState('')
  const [pointReason, setPointReason] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'add' | 'use'>('add')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin')
      return
    }

    loadData()
  }, [user, router])

  const loadData = () => {
    const allCustomers = storageService.getAllCustomers()
    setCustomers(allCustomers)

    const allPoints = JSON.parse(localStorage.getItem('points') || '[]')
    setPointHistory(
      allPoints.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    )
  }

  const handlePointTransaction = () => {
    if (!selectedCustomer || !pointAmount || !pointReason) {
      alert('必要な情報を入力してください')
      return
    }

    const amount = parseInt(pointAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('有効なポイント数を入力してください')
      return
    }

    if (transactionType === 'use' && amount > (selectedCustomer.points || 0)) {
      alert('使用ポイントが保有ポイントを超えています')
      return
    }

    // ポイント更新
    const newPoints =
      transactionType === 'add'
        ? (selectedCustomer.points || 0) + amount
        : (selectedCustomer.points || 0) - amount

    const updatedCustomer = { ...selectedCustomer, points: newPoints }
    storageService.updateCustomer(selectedCustomer.id, updatedCustomer)

    // トランザクション記録
    const transaction: PointTransaction = {
      id: Date.now().toString(),
      userId: selectedCustomer.id,
      amount: transactionType === 'add' ? amount : -amount,
      type: transactionType === 'add' ? 'earned' : 'redeemed',
      reason: pointReason,
      createdAt: new Date().toISOString(),
    }

    const points = JSON.parse(localStorage.getItem('points') || '[]')
    points.push(transaction)
    localStorage.setItem('points', JSON.stringify(points))

    // リセット
    setShowAddModal(false)
    setSelectedCustomer(null)
    setPointAmount('')
    setPointReason('')
    loadData()

    alert(`ポイントを${transactionType === 'add' ? '付与' : '使用'}しました`)
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm),
  )

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'earned':
        return '獲得'
      case 'redeemed':
        return '使用'
      case 'expired':
        return '失効'
      default:
        return type
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-600 bg-green-50'
      case 'redeemed':
        return 'text-red-600 bg-red-50'
      case 'expired':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ポイント管理</h1>
        <button
          onClick={() => {
            setTransactionType('add')
            setShowAddModal(true)
          }}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold"
        >
          ポイント付与
        </button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総発行ポイント</p>
          <p className="text-2xl font-bold text-green-600">
            {pointHistory
              .filter((p) => p.amount > 0)
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString()}
            pt
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総使用ポイント</p>
          <p className="text-2xl font-bold text-red-600">
            {Math.abs(
              pointHistory.filter((p) => p.amount < 0).reduce((sum, p) => sum + p.amount, 0),
            ).toLocaleString()}
            pt
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">現在の総ポイント</p>
          <p className="text-2xl font-bold text-primary">
            {customers.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString()}pt
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">平均保有ポイント</p>
          <p className="text-2xl font-bold">
            {Math.round(
              customers.reduce((sum, c) => sum + (c.points || 0), 0) / customers.length || 0,
            ).toLocaleString()}
            pt
          </p>
        </div>
      </div>

      {/* ポイント履歴 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">ポイント履歴</h2>
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
                pointHistory.slice(0, 20).map((transaction) => {
                  const customer = customers.find((c) => c.id === transaction.userId)
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
                            onClick={() => router.push(`/admin/customers/${customer.id}`)}
                            className="text-primary hover:text-dark-gold"
                          >
                            {customer.name}
                          </button>
                        ) : (
                          <span className="text-gray-500">不明</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}
                        >
                          {getTransactionTypeText(transaction.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount.toLocaleString()}pt
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{transaction.reason}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium">
                          {(customer?.points || 0).toLocaleString()}pt
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ポイント付与/使用モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              ポイント{transactionType === 'add' ? '付与' : '使用'}
            </h3>

            {/* 顧客選択 */}
            {!selectedCustomer ? (
              <div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="顧客名、メール、電話番号で検索"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b"
                    >
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">
                        {customer.email} | 現在: {(customer.points || 0).toLocaleString()}pt
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">
                    現在のポイント: {(selectedCustomer.points || 0).toLocaleString()}pt
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTransactionType('add')}
                      className={`flex-1 px-4 py-2 rounded-md ${
                        transactionType === 'add'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
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
                    >
                      ポイント使用
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ポイント数</label>
                  <input
                    type="number"
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="100"
                    min="1"
                    max={transactionType === 'use' ? selectedCustomer.points || 0 : undefined}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">理由</label>
                  <textarea
                    value={pointReason}
                    onChange={(e) => setPointReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder={transactionType === 'add' ? '誕生日特典' : 'サービス利用'}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePointTransaction}
                    className={`flex-1 px-4 py-2 rounded-md text-white ${
                      transactionType === 'add'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {transactionType === 'add' ? 'ポイント付与' : 'ポイント使用'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setSelectedCustomer(null)
                      setPointAmount('')
                      setPointReason('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
