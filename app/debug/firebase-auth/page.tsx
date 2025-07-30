'use client'

import { useState } from 'react'
import { firebaseAuth } from '@/lib/firebase/auth'
import { auth, db } from '@/lib/firebase/config'

export default function FirebaseAuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState(`test-${Date.now()}@example.com`)
  const [testPassword, setTestPassword] = useState('TestPassword123!')

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toISOString()}] ${info}`])
  }

  const checkFirebaseConfig = () => {
    addDebugInfo('=== Firebase設定チェック ===')
    
    // 環境変数の確認
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    Object.entries(config).forEach(([key, value]) => {
      if (value) {
        addDebugInfo(`✅ ${key}: ${value.substring(0, 20)}...`)
      } else {
        addDebugInfo(`❌ ${key}: 未設定`)
      }
    })

    // Firebase Auth の状態確認
    addDebugInfo(`\nFirebase Auth 状態: ${auth ? '初期化済み' : '未初期化'}`)
    addDebugInfo(`現在のユーザー: ${auth.currentUser ? auth.currentUser.email : 'なし'}`)
  }

  const testRegistration = async () => {
    setLoading(true)
    addDebugInfo('\n=== 登録テスト開始 ===')
    addDebugInfo(`Email: ${testEmail}`)
    addDebugInfo(`Password: ${testPassword}`)

    try {
      // 直接 Firebase Auth を使用してテスト
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      addDebugInfo('Firebase Auth モジュールをインポート完了')

      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword)
      addDebugInfo(`✅ Firebase Auth 登録成功: UID=${userCredential.user.uid}`)

      // Firestore へのアクセステスト
      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: testEmail,
        name: 'Debug Test User',
        phone: '090-0000-0000',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      addDebugInfo('✅ Firestore 書き込み成功')

      // クリーンアップ
      await userCredential.user.delete()
      addDebugInfo('✅ テストユーザー削除完了')

    } catch (error: any) {
      addDebugInfo(`❌ エラー発生: ${error.code || 'unknown'}`)
      addDebugInfo(`エラーメッセージ: ${error.message}`)
      
      if (error.code) {
        switch (error.code) {
          case 'auth/network-request-failed':
            addDebugInfo('⚠️  ネットワークエラー: Firebase への接続を確認してください')
            break
          case 'auth/invalid-api-key':
            addDebugInfo('⚠️  API キーが無効です: 環境変数を確認してください')
            break
          case 'auth/app-not-authorized':
            addDebugInfo('⚠️  アプリが認証されていません: Firebase コンソールで設定を確認してください')
            break
          case 'auth/project-not-found':
            addDebugInfo('⚠️  プロジェクトが見つかりません: プロジェクトIDを確認してください')
            break
        }
      }

      // スタックトレースも記録
      if (error.stack) {
        addDebugInfo('\nスタックトレース:')
        addDebugInfo(error.stack)
      }
    } finally {
      setLoading(false)
    }
  }

  const testAPIEndpoint = async () => {
    setLoading(true)
    addDebugInfo('\n=== API エンドポイントテスト ===')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'API Test User',
          phone: '090-1111-1111',
        }),
      })

      addDebugInfo(`レスポンスステータス: ${response.status}`)
      addDebugInfo(`レスポンスヘッダー: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)

      const data = await response.json()
      addDebugInfo(`レスポンスボディ: ${JSON.stringify(data, null, 2)}`)

      if (!response.ok) {
        addDebugInfo(`❌ APIエラー: ${data.error || 'Unknown error'}`)
      } else {
        addDebugInfo('✅ API登録成功')
      }

    } catch (error: any) {
      addDebugInfo(`❌ ネットワークエラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearDebugInfo = () => {
    setDebugInfo([])
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Firebase Auth デバッグツール</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">テストメール</label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">テストパスワード</label>
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={checkFirebaseConfig}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          設定確認
        </button>
        
        <button
          onClick={testRegistration}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          直接登録テスト
        </button>
        
        <button
          onClick={testAPIEndpoint}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          APIテスト
        </button>
        
        <button
          onClick={clearDebugInfo}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          クリア
        </button>
      </div>

      {loading && (
        <div className="mb-4 text-blue-600">処理中...</div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">デバッグ情報:</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {debugInfo.length > 0 ? debugInfo.join('\n') : 'ボタンをクリックしてテストを開始してください'}
        </pre>
      </div>
    </div>
  )
}