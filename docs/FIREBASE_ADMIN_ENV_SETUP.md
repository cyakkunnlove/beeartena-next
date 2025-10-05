# Firebase Admin SDK 環境変数設定ガイド

## 概要

Firestore への初期データ投入には、Firebase Admin SDK の環境変数が必要です。

## 必要な環境変数

### 最小限の設定（デフォルト認証を使用）

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 完全な設定（サービスアカウントを使用）

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## セットアップ手順

### 1. Firebase コンソールでサービスアカウントキーを取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. **プロジェクトの設定** > **サービスアカウント** タブ
4. **新しい秘密鍵の生成** をクリック
5. ダウンロードされた JSON ファイルを安全な場所に保存

### 2. 環境変数ファイルの作成

#### ローカル開発環境

`.env.local` ファイルを作成:

```bash
cp .env.example .env.local
```

ダウンロードした JSON ファイルから以下の情報を `.env.local` に設定:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**注意**: `FIREBASE_ADMIN_PRIVATE_KEY` は改行を `\n` でエスケープする必要があります。

#### 本番環境（Vercel）

**重要**: Vercel ダッシュボードで環境変数を設定する際は、**Production, Preview, Development すべての環境**に設定してください。

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Settings** > **Environment Variables**
4. 以下の環境変数を追加（各変数で Production, Preview, Development すべてにチェック）:

```
FIREBASE_ADMIN_PROJECT_ID = your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL = firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**注意**: `FIREBASE_ADMIN_PRIVATE_KEY` は必ず**ダブルクォートで囲んで**改行を `\n` でエスケープしてください。

または、Vercel CLI で設定:

```bash
vercel env add FIREBASE_ADMIN_PROJECT_ID production
vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production
vercel env add FIREBASE_ADMIN_PRIVATE_KEY production

# Preview と Development にも同様に追加
vercel env add FIREBASE_ADMIN_PROJECT_ID preview
vercel env add FIREBASE_ADMIN_CLIENT_EMAIL preview
vercel env add FIREBASE_ADMIN_PRIVATE_KEY preview
```

### 3. 環境変数の検証

```bash
# 環境変数が設定されているか確認
node -e "console.log(process.env.FIREBASE_ADMIN_PROJECT_ID)"
node -e "console.log(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)"

# API キーに改行が含まれていないか確認（末尾の文字コードが10なら改行あり）
node -e "const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY; console.log('Last char code:', key.charCodeAt(key.length-1))"
```

**重要**: `NEXT_PUBLIC_FIREBASE_API_KEY` などの環境変数に**末尾の改行が含まれていないこと**を確認してください。改行があると Firebase 初期化エラーの原因になります。

## トラブルシューティング

### エラー: "FIREBASE_ADMIN_PROJECT_ID is required"

原因: 環境変数が設定されていません。

解決策:
1. `.env.local` ファイルが存在するか確認
2. ファイル内に正しく環境変数が記載されているか確認
3. アプリケーションを再起動

### エラー: "Permission denied"

原因: サービスアカウントに適切な権限がありません。

解決策:
1. Firebase Console > IAM と管理 > IAM
2. サービスアカウントに「Firebase Admin」ロールを付与
3. Firestore のルールを確認

### 秘密鍵のフォーマットエラー

原因: `FIREBASE_ADMIN_PRIVATE_KEY` の改行が正しくエスケープされていません。

解決策:
```bash
# JSON から秘密鍵を抽出してエスケープ
cat service-account.json | jq -r '.private_key' | awk '{printf "%s\\n", $0}'
```

### エラー: "FIREBASE_API_KEY に改行が含まれている"

原因: `.env.local` や Vercel 環境変数の値に末尾の改行が混入しています。

解決策:
1. `.env.local` を開き、各環境変数の値の**末尾に改行がないこと**を確認
2. Vercel ダッシュボードで環境変数を再設定（コピー&ペースト時に改行が入らないよう注意）
3. 確認コマンド: `node -e "console.log('Last char code:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY.charCodeAt(process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length-1))"`
   - 結果が `10` なら改行あり → 削除が必要

## セキュリティのベストプラクティス

1. **秘密鍵を Git にコミットしない**
   - `.env.local` は `.gitignore` に含まれています
   - サービスアカウント JSON ファイルも `.gitignore` に追加してください

2. **本番環境では環境変数を使用**
   - Vercel の環境変数機能を活用
   - 秘密鍵はコードに含めない

3. **サービスアカウントの権限を最小限に**
   - 必要な権限のみを付与
   - 定期的に使用状況を監査

## 参考リンク

- [Firebase Admin SDK セットアップ](https://firebase.google.com/docs/admin/setup)
- [Vercel 環境変数ドキュメント](https://vercel.com/docs/environment-variables)
