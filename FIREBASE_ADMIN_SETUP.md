# Firebase Admin SDK セットアップ手順

管理者ユーザーを自動作成するには、Firebase Admin SDKの設定が必要です。

## 1. サービスアカウントキーの取得

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト「beeart-ena」を選択
3. 歯車アイコン → 「プロジェクトの設定」をクリック
4. 「サービスアカウント」タブを選択
5. 「新しい秘密鍵の生成」をクリック
6. JSONファイルがダウンロードされます

## 2. 環境変数の設定

ダウンロードしたJSONファイルを開き、以下の値を`.env.local`に設定：

```bash
# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=beeart-ena
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@beeart-ena.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**注意**: 
- `FIREBASE_ADMIN_PRIVATE_KEY`は改行を`\n`に置換して1行にする
- ダブルクォートで囲む

## 3. 管理者ユーザーの作成

```bash
cd /Users/takuyakatou/Library/CloudStorage/OneDrive-個人用/デスクトップ/beeartena-next
npm install firebase-admin
node scripts/create-admin-user.js
```

## 4. Firebaseモードの有効化

`.env.local`を編集：

```bash
NEXT_PUBLIC_USE_FIREBASE=true
```

## 5. 開発サーバーの再起動

```bash
npm run dev
```

これで管理者ログインが可能になります。

## セキュリティ上の注意

- サービスアカウントキーは機密情報です
- `.env.local`はGitにコミットしないでください
- 本番環境では環境変数として安全に管理してください