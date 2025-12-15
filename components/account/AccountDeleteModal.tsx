'use client'

import { useState } from 'react'

interface AccountDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}

export default function AccountDeleteModal({
  isOpen,
  onClose,
  onConfirm,
}: AccountDeleteModalProps) {
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (confirmText !== '削除する') {
      setError('確認テキストが一致しません')
      return
    }

    setIsDeleting(true)
    try {
      await onConfirm(password)
      // アカウント削除成功後の処理は親コンポーネントで行う
    } catch (error: any) {
      setError(error.message || 'アカウントの削除に失敗しました')
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-600">アカウント削除</h2>
        
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>警告:</strong> この操作は取り消せません。
          </p>
          <p className="text-sm text-red-800 mt-2">
            アカウントを削除すると、以下のデータが永久に失われます：
          </p>
          <ul className="list-disc list-inside text-sm text-red-800 mt-2">
            <li>予約履歴</li>
            <li>プロフィール情報</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              placeholder="パスワードを入力"
            />
          </div>

          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium mb-1">
              確認のため「削除する」と入力してください
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              placeholder="削除する"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isDeleting || confirmText !== '削除する'}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '削除中...' : 'アカウントを削除'}
            </button>
            <button
              type="button"
              onClick={onClose}
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
