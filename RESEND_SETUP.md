# Resendメール設定ガイド

## 概要

このプロジェクトでは、メール送信サービスとして[Resend](https://resend.com)を使用しています。予約確認、キャンセル通知などの自動メール送信に対応しています。

## 設定手順

### 1. Resendアカウントの作成

1. [Resend](https://resend.com)にアクセス
2. 「Sign Up」から新規アカウントを作成
3. メールアドレスを確認

### 2. APIキーの取得

1. ダッシュボードにログイン
2. 「API Keys」セクションに移動
3. 「Create API Key」をクリック
4. APIキーをコピー（`re_`で始まる文字列）

### 3. ドメインの設定（オプション）

独自ドメインからメールを送信する場合：

1. 「Domains」セクションに移動
2. 「Add Domain」をクリック
3. ドメイン名（例：beeartena.jp）を入力
4. DNSレコードを設定：
   - SPF: `TXT @ "v=spf1 include:amazonses.com ~all"`
   - DKIM: Resendが提供する3つのCNAMEレコード
   - MX: `feedback-smtp.us-east-1.amazonses.com`（優先度10）

### 4. 環境変数の設定

#### ローカル開発環境

`.env.local`ファイルに以下を追加：

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=info@beeartena.jp
```

#### 本番環境（Vercel）

```bash
# Resend APIキーを設定
npx vercel env add RESEND_API_KEY production

# 管理者メールアドレスを設定
npx vercel env add ADMIN_EMAIL production
```

### 5. メール送信テスト

開発環境でテスト：

```bash
# 開発サーバーを起動
npm run dev

# 新規予約を作成してメールが送信されることを確認
```

## メールテンプレート

以下のメールが自動送信されます：

### 1. 予約確認メール（顧客向け）
- 送信タイミング：予約作成時
- 内容：予約日時、メニュー、料金、注意事項など

### 2. 予約通知メール（管理者向け）
- 送信タイミング：予約作成時
- 内容：予約詳細、顧客情報

### 3. キャンセル確認メール（顧客向け）
- 送信タイミング：予約キャンセル時
- 内容：キャンセルされた予約の情報

### 4. キャンセル通知メール（管理者向け）
- 送信タイミング：予約キャンセル時
- 内容：キャンセル詳細、理由

## トラブルシューティング

### メールが送信されない

1. APIキーが正しく設定されているか確認
2. Resendダッシュボードでエラーログを確認
3. 環境変数が正しく読み込まれているか確認：
   ```javascript
   console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set')
   ```

### ドメイン認証エラー

1. DNSレコードが正しく設定されているか確認
2. DNS伝播に時間がかかる場合があります（最大48時間）
3. Resendダッシュボードで認証状態を確認

### 開発環境でのテスト

開発環境では、環境変数が設定されていない場合はモックサービスが使用され、コンソールにメール内容が出力されます。

## 料金

- 無料プラン：月100通まで
- 有料プラン：月$20から（月50,000通）
- 詳細は[Resend Pricing](https://resend.com/pricing)を参照

## セキュリティ

- APIキーは絶対に公開リポジトリにコミットしないこと
- 本番環境では環境変数として安全に管理すること
- ドメイン認証を設定してなりすましを防ぐこと