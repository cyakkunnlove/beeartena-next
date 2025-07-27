# Firebase「BEEART ENA」接続ガイド

## 🚀 クイックスタート

既存のFirebaseプロジェクト「BEEART ENA」に接続するには：

```bash
npm run firebase:setup
```

## 📋 セットアップ手順

### 1. Firebaseログイン
スクリプトを実行すると自動的にブラウザが開きます。
Googleアカウントでログインしてください。

### 2. プロジェクトID入力
「BEEART ENA」のプロジェクトIDを入力します。
例：
- `beeartena`
- `beeart-ena`
- `beeartena-prod`

### 3. Firebase設定値の取得

[Firebase Console](https://console.firebase.google.com) にアクセスし：

1. プロジェクト設定 → 全般
2. 「マイアプリ」セクションのWebアプリ設定
3. firebaseConfig の値をコピー

### 4. 必要な有効化

#### Firestore
- [Firestore](https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore)
- 「データベースを作成」をクリック
- 本番モードで開始
- ロケーション：asia-northeast1

#### Authentication
- [Authentication](https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication)
- 「Sign-in method」タブ
- メール/パスワードを有効化

#### 管理者アカウント作成
- Authentication → Users
- 「ユーザーを追加」
- Email: `admin@beeartena.jp`
- Password: 任意（強力なパスワード推奨）

## 🔐 環境変数

セットアップ完了後、`.env.local`が自動生成されます：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

JWT_SECRET=your-secret-jwt-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## ⚠️ 重要事項

1. **JWT_SECRET**は必ず変更してください
2. **serviceAccountKey.json**は絶対にGitにコミットしない
3. 本番環境では強力なパスワードを使用

## 🚀 動作確認

```bash
npm run dev
```

http://localhost:3000 にアクセスし、管理者ログインでテスト。

## 🌐 Vercelデプロイ

1. Vercelダッシュボードで環境変数を設定
2. `vercel` コマンドでデプロイ