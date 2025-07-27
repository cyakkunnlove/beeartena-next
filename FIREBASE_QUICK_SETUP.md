# Firebase クイックセットアップガイド

## 🚀 自動セットアップ（推奨）

Firebase CLIを使用した自動セットアップスクリプトを用意しました。

### 1. セットアップスクリプトの実行

```bash
# セットアップスクリプトを実行
./firebase-setup.sh
```

このスクリプトは以下を自動的に行います：
- Firebase CLIのインストール確認
- Firebaseプロジェクトの作成/選択
- Firestore、Authentication、Hostingの設定
- セキュリティルールのデプロイ
- 環境変数ファイル（.env.local）の生成
- 初期データの作成（オプション）

### 2. 手動で必要な設定

スクリプト実行後、以下を手動で設定してください：

1. **Firebase Authenticationを有効化**
   - [Firebase Console](https://console.firebase.google.com)にアクセス
   - Authentication → Sign-in method
   - メール/パスワードを有効化

2. **管理者パスワードの設定**
   - Authentication → Users
   - 「ユーザーを追加」をクリック
   - Email: `admin@beeartena.jp`
   - Password: 任意のパスワード

## 📝 手動セットアップ

自動セットアップを使用しない場合：

### 1. Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

### 2. Firebaseプロジェクトの作成

```bash
# Firebaseにログイン
firebase login

# プロジェクトを作成
firebase projects:create beeartena-prod --display-name "Bee Artena"

# プロジェクトを選択
firebase use beeartena-prod
```

### 3. Firestoreの有効化

```bash
# Firestoreデータベースを作成
firebase firestore:databases:create default --location asia-northeast1

# セキュリティルールをデプロイ
firebase deploy --only firestore:rules
```

### 4. Webアプリの追加と設定取得

```bash
# Webアプリを追加
firebase apps:create web "Bee Artena Web"

# 設定を表示
firebase apps:sdkconfig web
```

### 5. 環境変数の設定

`.env.local`ファイルを作成：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

JWT_SECRET=your-secret-jwt-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🔧 トラブルシューティング

### Firebase CLIがインストールできない場合
```bash
# npmが使えない場合はcurlを使用
curl -sL https://firebase.tools | bash
```

### 権限エラーが発生する場合
```bash
# sudoを使用してインストール
sudo npm install -g firebase-tools
```

### プロジェクトIDが既に使用されている場合
別のプロジェクトIDを使用してください（例：beeartena-prod-2024）

## ✅ セットアップ完了の確認

1. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでアクセス**
   - http://localhost:3000

3. **管理者ログインテスト**
   - Email: admin@beeartena.jp
   - Password: （設定したパスワード）

## 🚀 Vercelへのデプロイ

1. **Vercelにログイン**
   ```bash
   vercel login
   ```

2. **デプロイ**
   ```bash
   vercel
   ```

3. **環境変数の設定**
   - Vercelダッシュボードで.env.localの内容を環境変数として設定

## 📌 重要な注意事項

- JWT_SECRETは必ず変更してください
- 本番環境では強力なパスワードを使用してください
- Firebaseの利用料金に注意してください（無料枠あり）