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
  sendEmailVerification,
  applyActionCode,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

import { mockAuth } from '../mock/mockFirebase'
import { User as AppUser, getErrorMessage } from '../types'
import { logger } from '../utils/logger'

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
        ...(birthday && { birthday }),
        ...(birthday && { birthDate: birthday }),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      // メール認証を送信
      try {
        await sendEmailVerification(user)
      } catch (error) {
        logger.warn('Failed to send verification email', {
          code: (error as { code?: string })?.code,
          message: (error as { message?: string })?.message,
        })
        // メール送信に失敗してもユーザー登録は成功とする
      }

      return userData
    } catch (error: any) {
      logger.error('Firebase register error', {
        code: error?.code,
        message: error?.message,
        customData: error?.customData,
        serverResponse: error?.serverResponse,
      })

      // Firebase Auth のエラーコードに基づいてメッセージを返す
      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            throw new Error('このメールアドレスは既に登録されています')
          case 'auth/invalid-email':
            throw new Error('有効なメールアドレスを入力してください')
          case 'auth/weak-password':
            throw new Error('パスワードは8文字以上で設定してください')
          case 'auth/operation-not-allowed':
            throw new Error('メール/パスワード認証が無効です。管理者に連絡してください')
          case 'auth/network-request-failed':
            throw new Error('ネットワークエラーが発生しました。接続を確認してください')
          case 'auth/too-many-requests':
            throw new Error('リクエストが多すぎます。しばらくしてからお試しください')
          default:
            throw new Error(`Firebase認証エラー: ${error.code} - ${error.message}`)
        }
      }

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
      logger.warn('Firebase login error', {
        code: error?.code,
        message: error?.message,
      })

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

  // メール認証の確認
  async verifyEmail(actionCode: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('メール認証機能は現在利用できません')
    }

    try {
      await applyActionCode(auth, actionCode)
    } catch (error: any) {
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('認証リンクが無効です')
      }
      throw new Error(getErrorMessage(error) || 'メール認証に失敗しました')
    }
  },

  // メール認証の再送信
  async resendVerificationEmail(): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('メール認証機能は現在利用できません')
    }

    const user = auth.currentUser
    if (!user) {
      throw new Error('ユーザーがログインしていません')
    }

    try {
      await sendEmailVerification(user)
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'メール認証の送信に失敗しました')
    }
  },

  // メール認証状態の確認
  isEmailVerified(): boolean {
    if (!isFirebaseConfigured()) {
      return true // モック環境では常に認証済みとする
    }

    const user = auth.currentUser
    return user?.emailVerified ?? false
  },

  // Googleログイン
  async signInWithGoogle(): Promise<AppUser> {
    if (!isFirebaseConfigured()) {
      throw new Error('Google認証は現在利用できません')
    }

    const provider = new GoogleAuthProvider()

    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Firestoreにユーザー情報が存在するか確認
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (userDoc.exists()) {
        // 既存ユーザーの場合
        return userDoc.data() as AppUser
      } else {
        // 新規ユーザーの場合、Firestoreにデータを作成
        const userData: AppUser = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          phone: '', // 後で入力してもらう
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await setDoc(doc(db, 'users', user.uid), userData)
        return userData
      }
    } catch (error: any) {
      logger.warn('Google login error', {
        code: error?.code,
        message: error?.message,
      })

      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('ログインがキャンセルされました')
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('ポップアップがブロックされました。ブラウザの設定を確認してください')
      }

      throw new Error(getErrorMessage(error) || 'Googleログインに失敗しました')
    }
  },

  // パスワードリセットメール送信
  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('パスワードリセット機能は現在利用できません')
    }

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      logger.warn('Password reset email error', {
        code: error?.code,
        message: error?.message,
      })

      if (error.code === 'auth/user-not-found') {
        throw new Error('このメールアドレスは登録されていません')
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('有効なメールアドレスを入力してください')
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('リクエストが多すぎます。しばらくしてからお試しください')
      }

      throw new Error(getErrorMessage(error) || 'パスワードリセットメールの送信に失敗しました')
    }
  },
}
