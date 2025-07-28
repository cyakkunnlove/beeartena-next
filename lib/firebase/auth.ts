import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

import { mockAuth } from '../mock/mockFirebase'
import { User as AppUser, getErrorMessage } from '../types'

import { auth, db } from './config'

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}

export const firebaseAuth = {
  // 新規登録
  async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    birthday?: string,
  ): Promise<AppUser> {
    // Firebaseが設定されていない場合はモックを使用
    if (!isFirebaseConfigured()) {
      return mockAuth.register(email, password, name, phone, birthday)
    }

    try {
      // Firebase Authでユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // プロフィール更新
      await updateProfile(user, { displayName: name })

      // Firestoreにユーザー情報を保存
      const userData: AppUser = {
        id: user.uid,
        email: email,
        name: name,
        phone: phone,
        role: 'customer',
        birthday: birthday,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      return userData
    } catch (error) {
      throw new Error(getErrorMessage(error) || '登録に失敗しました')
    }
  },

  // ログイン
  async login(email: string, password: string): Promise<AppUser> {
    // Firebaseが設定されていない場合はモックを使用
    if (!isFirebaseConfigured()) {
      return mockAuth.login(email, password)
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Firestoreからユーザー情報を取得
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) {
        throw new Error('ユーザー情報が見つかりません')
      }

      return userDoc.data() as AppUser
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'ログインに失敗しました')
    }
  },

  // ログアウト
  async logout(): Promise<void> {
    // Firebaseが設定されていない場合はモックを使用
    if (!isFirebaseConfigured()) {
      return mockAuth.logout()
    }

    try {
      await signOut(auth)
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'ログアウトに失敗しました')
    }
  },

  // 現在のユーザー取得
  async getCurrentUser(): Promise<AppUser | null> {
    // Firebaseが設定されていない場合はモックを使用
    if (!isFirebaseConfigured()) {
      return mockAuth.getCurrentUser()
    }

    const user = auth.currentUser
    if (!user) return null

    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (!userDoc.exists()) return null

    return userDoc.data() as AppUser
  },

  // 認証状態の監視
  onAuthStateChange(callback: (user: AppUser | null) => void) {
    // Firebaseが設定されていない場合はモックを使用
    if (!isFirebaseConfigured()) {
      return mockAuth.onAuthStateChange(callback)
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          callback(userDoc.data() as AppUser)
        } else {
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  },
}
