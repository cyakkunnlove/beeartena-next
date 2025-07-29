'use client'

import { useState } from 'react'
import { Customer } from '@/lib/types'

interface CustomerDeleteModalProps {
  isOpen: boolean
  customer: Customer | null
  onClose: () => void
  onConfirm: (customerId: string) => Promise<void>
}

export default function CustomerDeleteModal({
  isOpen,
  customer,
  onClose,
  onConfirm,
}: CustomerDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    
    setError('')

    if (confirmText !== customer.email) {
      setError('メールアドレスが一致しません')
      return
    }

    setIsDeleting(true)
    try {
      await onConfirm(customer.id)
      setConfirmText('')
      onClose()
    } catch (error: any) {
      setError(error.message || '顧客の削除に失敗しました')
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError('')
    onClose()
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-600">顧客アカウント削除</h2>
        
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>警告:</strong> この操作は取り消せません。
          </p>
          <p className="text-sm text-red-800 mt-2">
            以下の顧客データが永久に削除されます：
          </p>
          <div className="mt-2 p-2 bg-white rounded">
            <p className="text-sm font-medium">{customer.name}</p>
            <p className="text-sm text-gray-600">{customer.email}</p>
            <p className="text-sm text-gray-600">ID: {customer.id}</p>
          </div>
          <ul className="list-disc list-inside text-sm text-red-800 mt-2">
            <li>予約履歴</li>
            <li>ポイント残高（{customer.points || 0}ポイント）</li>
            <li>プロフィール情報</li>
            <li>利用履歴</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium mb-1">
              確認のため顧客のメールアドレスを入力してください
            </label>
            <input
              type="email"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              placeholder={customer.email}
            />
            <p className="text-xs text-gray-500 mt-1">
              入力: {customer.email}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isDeleting || confirmText !== customer.email}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '削除中...' : '顧客を削除'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn btn-secondary"
              disabled={isDeleting}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}