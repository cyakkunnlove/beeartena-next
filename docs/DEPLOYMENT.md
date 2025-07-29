# Vercel デプロイメント設定ガイド

## 環境変数の設定

Vercelで本番環境を正しく動作させるには、以下の環境変数を設定する必要があります。

### 設定手順

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト「beeartena-next」を選択
3. 「Settings」タブをクリック
4. 左側メニューから「Environment Variables」を選択
5. 以下の環境変数を追加

### 必須の環境変数

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beeart-ena.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beeart-ena
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beeart-ena.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=47862693911
NEXT_PUBLIC_FIREBASE_APP_ID=1:47862693911:web:f7181ecac113393d5c9c52

# Firebase Admin SDK (サーバーサイド用)
FIREBASE_ADMIN_PROJECT_ID=beeart-ena
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@beeart-ena.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...(実際のキー)...\n-----END PRIVATE KEY-----"

# Authentication
JWT_SECRET=beeartena-secret-key-2024-change-this-in-production
ADMIN_PASSWORD=BeeArtEna2024Admin!

# Environment
NEXT_PUBLIC_USE_FIREBASE=true
NODE_ENV=production
```

### 環境変数の追加方法

1. 「Add」ボタンをクリック
2. 「Name」フィールドに環境変数名を入力
3. 「Value」フィールドに値を入力
4. 「Environment」で適用する環境を選択：
   - Production
   - Preview
   - Development
5. 「Save」をクリック

### 注意事項

- `NEXT_PUBLIC_`で始まる環境変数はクライアント側で使用可能
- それ以外の環境変数はサーバーサイドのみで使用可能
- `FIREBASE_ADMIN_PRIVATE_KEY`は改行を`\n`で表現する必要があります
- 環境変数を追加/変更した後は、再デプロイが必要です

### 再デプロイ方法

環境変数を設定した後：

1. Vercelダッシュボードの「Deployments」タブへ
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Redeploy」ボタンをクリック

### トラブルシューティング

環境変数が正しく読み込まれない場合：

1. `/debug`ページで環境変数の状態を確認
2. ブラウザのキャッシュをクリア
3. プライベートブラウジングモードで確認
4. Vercelのビルドログを確認

### Firebase Admin SDKの設定

Firebase Admin SDKの認証情報を取得する方法：

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト設定 → サービスアカウント
3. 「新しい秘密鍵の生成」をクリック
4. ダウンロードしたJSONファイルから以下の値を取得：
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`