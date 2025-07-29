import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
    } catch (error: any) {
      console.error('Firebase login error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      // より詳細なエラーメッセージを返す
      if (error.code === 'auth/user-not-found') {
        throw new Error('ユーザーが見つかりません')
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('パスワードが正しくありません')
      }
      if (error.code === 'auth/invalid-credential') {
        throw new Error('認証情報が無効です')
      }
      
      throw new Error(getErrorMessage(error) || `ログインに失敗しました: ${error.message}`)
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

  // パスワード変更
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('パスワード変更機能は現在利用できません')
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error('ユーザーがログインしていません')
    }

    try {
      // 再認証
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // パスワード更新
      await updatePassword(user, newPassword)
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        throw new Error('現在のパスワードが正しくありません')
      }
      throw new Error(getErrorMessage(error) || 'パスワードの変更に失敗しました')
    }
  },

  // アカウント削除
  async deleteAccount(password: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('アカウント削除機能は現在利用できません')
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error('ユーザーがログインしていません')
    }

    try {
      // 再認証
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)

      // Firestoreからユーザーデータを削除
      // 注: 実際の実装では、Cloud Functionsを使って関連データも削除する必要があります
      await setDoc(doc(db, 'users', user.uid), { deleted: true, deletedAt: new Date() }, { merge: true })

      // Firebase Authからユーザーを削除
      await deleteUser(user)
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        throw new Error('パスワードが正しくありません')
      }
      throw new Error(getErrorMessage(error) || 'アカウントの削除に失敗しました')
    }
  },
}
