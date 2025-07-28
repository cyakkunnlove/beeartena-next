'use client'

import { WifiIcon } from '@heroicons/react/24/outline'
import React from 'react'

export default function OfflinePage() {
  const handleRetry = () => {
    if (window.navigator.onLine) {
      window.location.reload()
    } else {
      alert('インターネット接続を確認してください')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            <WifiIcon className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">オフラインです</h1>

        <p className="text-gray-600 mb-8">
          インターネット接続がありません。
          <br />
          接続を確認してから再度お試しください。
        </p>

        <button
          onClick={handleRetry}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-dark-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          aria-label="ページを再読み込み"
        >
          再読み込み
        </button>

        <div className="mt-12 text-sm text-gray-500">
          <p>オフライン中でも以下の機能が利用可能です：</p>
          <ul className="mt-2 space-y-1">
            <li>• 予約履歴の確認（キャッシュ済みのもの）</li>
            <li>• 施術メニューの閲覧</li>
            <li>• お問い合わせフォーム（送信は復帰後）</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
