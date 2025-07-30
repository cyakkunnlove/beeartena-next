import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase設定
// 注意: 本番環境では環境変数から読み込むこと
const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key').trim(),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com').trim(),
  projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project').trim(),
  storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com').trim(),
  messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789').trim(),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef').trim(),
}

// Firebase設定が正しいかチェック
export const isFirebaseConfigured = () => {
  const apiKey = firebaseConfig.apiKey
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

// デバッグ用
if (typeof window !== 'undefined') {
  console.log('Firebase Configuration Status:', {
    isConfigured: isFirebaseConfigured(),
    hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    apiKeyPrefix: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
  })
}

// Initialize Firebase (シングルトンパターン)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
