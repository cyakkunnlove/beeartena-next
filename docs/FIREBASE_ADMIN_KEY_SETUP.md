# Firebase Admin SDK秘密鍵の設定方法

## 1. 秘密鍵の生成

1. Firebase Console (https://console.firebase.google.com/) にアクセス
2. プロジェクト「beeart-ena」を選択
3. ⚙️ プロジェクトの設定 → サービスアカウント
4. 「新しい秘密鍵の生成」をクリック
5. JSONファイルがダウンロードされます

## 2. JSONファイルから必要な情報を抽出

ダウンロードしたJSONファイルには以下の情報が含まれています：

```json
{
  "type": "service_account",
  "project_id": "beeart-ena",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@beeart-ena.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## 3. Vercel環境変数の更新

以下の環境変数を更新する必要があります：

### FIREBASE_ADMIN_CLIENT_EMAIL
JSONファイルの `client_email` の値を使用

### FIREBASE_ADMIN_PRIVATE_KEY
JSONファイルの `private_key` の値を使用
**重要**: この値は複数行の文字列です。Vercelダッシュボードで設定する際は、`\n`を実際の改行に置換してください。

### FIREBASE_ADMIN_PROJECT_ID
JSONファイルの `project_id` の値を使用（通常は `beeart-ena`）

## 4. Vercelダッシュボードでの設定

1. https://vercel.com/dashboard にアクセス
2. プロジェクト「beeartena-next」を選択
3. Settings → Environment Variables
4. 各環境変数を更新：

#### FIREBASE_ADMIN_CLIENT_EMAIL
- 値: JSONファイルの `client_email` の値
- 環境: Production, Preview, Development

#### FIREBASE_ADMIN_PROJECT_ID
- 値: `beeart-ena`
- 環境: Production, Preview, Development

#### FIREBASE_ADMIN_PRIVATE_KEY
- 値: JSONファイルの `private_key` の値（実際の改行を含む形式で）
- 環境: Production, Preview, Development

**FIREBASE_ADMIN_PRIVATE_KEY の設定例**:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCr0E/RAcRsUbTx
（中略）
ebrfRiozFRhtGa5Vnam0cf8=
-----END PRIVATE KEY-----
```

## 5. 設定後の確認

1. 全ての環境変数を保存
2. Vercel CLIで再デプロイ: `vercel --prod`
3. デプロイ完了後、動作確認

## セキュリティに関する注意事項

- ダウンロードしたJSONファイルは安全な場所に保管してください
- 秘密鍵は絶対に公開リポジトリにコミットしないでください
- 不要になったJSONファイルは削除してください