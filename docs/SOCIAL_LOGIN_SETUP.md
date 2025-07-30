# ソーシャルログイン設定ガイド

## 概要
このドキュメントでは、Google/Appleアカウントでのログイン機能の設定方法と費用について説明します。

## 1. Googleアカウント連携

### 設定手順

1. **Google Cloud Consoleでプロジェクトを作成**
   - https://console.cloud.google.com にアクセス
   - 新しいプロジェクトを作成または既存のプロジェクトを選択

2. **OAuth 2.0認証情報の作成**
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuthクライアントID」を選択
   - アプリケーションの種類：「ウェブアプリケーション」
   - 承認済みのJavaScriptオリジン：
     - `http://localhost:3000`（開発環境）
     - `https://beeartena-next.vercel.app`（本番環境）
   - 承認済みのリダイレクトURI：
     - `http://localhost:3000/auth/callback`
     - `https://beeartena-next.vercel.app/auth/callback`

3. **Firebase Consoleで有効化**
   - Firebase Console（https://console.firebase.google.com）にアクセス
   - プロジェクトを選択
   - 「Authentication」→「Sign-in method」タブ
   - 「Google」を有効化
   - Google Cloud Consoleで取得したクライアントIDとシークレットを設定

### 費用
- **無料**（Google Cloud Platformの無料枠内で利用可能）
- 制限：なし（通常のWebアプリケーションの使用範囲内）

## 2. Appleアカウント連携

### 設定手順

1. **Apple Developer Programへの登録**
   - https://developer.apple.com にアクセス
   - Apple Developer Programに登録（年間$99 / 約15,000円）

2. **App IDの作成**
   - Developer Consoleで「Certificates, Identifiers & Profiles」を選択
   - 「Identifiers」→「+」ボタンをクリック
   - 「App IDs」を選択し、「Sign In with Apple」を有効化

3. **Service IDの作成**
   - 「Identifiers」→「+」ボタンをクリック
   - 「Services IDs」を選択
   - 「Sign In with Apple」を有効化
   - Return URLsに以下を追加：
     - `https://beeart-ena.firebaseapp.com/__/auth/handler`

4. **Keyの作成**
   - 「Keys」→「+」ボタンをクリック
   - 「Sign In with Apple」を有効化
   - 作成されたKeyをダウンロード（.p8ファイル）

5. **Firebase Consoleで有効化**
   - 「Authentication」→「Sign-in method」タブ
   - 「Apple」を有効化
   - Service ID、Team ID、Key ID、秘密鍵を設定

### 費用
- **年間$99（約15,000円）** - Apple Developer Program登録料
- これは年間費用で、毎年更新が必要

## 3. 実装コード例

### Firebase設定の更新

```typescript
// lib/firebase/auth.ts に追加
import {
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from 'firebase/auth'

// Googleログイン
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  try {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    
    // Firestoreにユーザー情報を保存
    const userData: AppUser = {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      phone: '', // 後で入力してもらう
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true })
    return userData
  } catch (error) {
    throw new Error('Googleログインに失敗しました')
  }
}

// Appleログイン
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  
  try {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    
    // Firestoreにユーザー情報を保存
    const userData: AppUser = {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      phone: '', // 後で入力してもらう
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true })
    return userData
  } catch (error) {
    throw new Error('Appleログインに失敗しました')
  }
}
```

### ログインボタンコンポーネント

```tsx
// components/auth/SocialLoginButtons.tsx
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'

export default function SocialLoginButtons() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
      router.push('/mypage')
    } catch (error) {
      console.error('Googleログインエラー:', error)
    }
  }

  const handleAppleLogin = async () => {
    try {
      await signInWithApple()
      router.push('/mypage')
    } catch (error) {
      console.error('Appleログインエラー:', error)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <FcGoogle className="text-xl" />
        <span>Googleでログイン</span>
      </button>

      <button
        onClick={handleAppleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
      >
        <FaApple className="text-xl" />
        <span>Appleでログイン</span>
      </button>
    </div>
  )
}
```

## 4. セキュリティ設定

### Firebase Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー自身のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. 推奨事項

1. **Googleログインを優先実装**
   - 無料で実装可能
   - 多くのユーザーがGoogleアカウントを持っている
   - 設定が比較的簡単

2. **Appleログインは後から追加**
   - iOSアプリを作る場合は必須
   - Webのみの場合はオプション
   - 年間費用が発生するため、事業の成長に合わせて検討

3. **プライバシーポリシーの更新**
   - ソーシャルログインを使用する場合、プライバシーポリシーに以下を記載：
   - 収集する情報（メールアドレス、名前）
   - 情報の使用目的
   - 第三者サービス（Google/Apple）との連携について

## まとめ

| サービス | 初期費用 | 年間費用 | 難易度 | 推奨度 |
|---------|---------|---------|-------|--------|
| Google  | 無料    | 無料    | 簡単  | ★★★★★ |
| Apple   | 無料    | $99     | 中級  | ★★★☆☆ |

最初はGoogleログインのみ実装し、ユーザー数が増えてきたらAppleログインを追加することをお勧めします。