'use client'

import { Customer } from '@/lib/types'

interface Props {
  open?: boolean
  customer: Customer | null
  onClose: () => void
  disableLiveRequests?: boolean
}

export default function CustomerDetailModal({ open = true, customer, onClose }: Props) {
  if (!open || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">顧客詳細</p>
            <h2 className="text-2xl font-bold">{customer.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">メール</p>
            <p className="font-medium break-words">{customer.email || '未登録'}</p>
          </div>
          <div>
            <p className="text-gray-500">電話</p>
            <p className="font-medium">{customer.phone || '未登録'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">ランク</p>
              <p className="font-medium">{customer.tier || 'bronze'}</p>
            </div>
            <div>
              <p className="text-gray-500">ポイント</p>
              <p className="font-medium">{customer.points ?? 0} pt</p>
            </div>
          </div>
          <div>
            <p className="text-gray-500">備考</p>
            <p className="whitespace-pre-wrap break-words">{customer.notes || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <p>作成日</p>
              <p>{customer.createdAt ? new Date(customer.createdAt as any).toLocaleString('ja-JP') : '-'}</p>
            </div>
            <div>
              <p>更新日</p>
              <p>{customer.updatedAt ? new Date(customer.updatedAt as any).toLocaleString('ja-JP') : '-'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
