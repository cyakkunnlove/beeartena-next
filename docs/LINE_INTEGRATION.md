# LINE連携（会話ログ保存・管理画面）

## 目的

公式LINE（LINE公式アカウント）のメッセージをWebhookで受信し、Firestoreへ保存して管理画面で検索・閲覧できるようにします。
（任意で管理画面から返信も可能です）

## 必要な環境変数

`.env.local` / Vercel の環境変数に以下を設定します。

```env
LINE_CHANNEL_SECRET=xxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
```

※ `LINE_CHANNEL_ACCESS_TOKEN` は「管理画面から送信」機能にも使用します。

## （任意）既存GAS/Discord通知へ転送する

既存のGAS（Discord通知・自動返信）を継続利用しつつ、Webhook受信を本プロジェクトで行う場合は、
以下を設定すると本Webhookが **受信した内容をそのまま別Webhookへ転送**します。

```env
LINE_WEBHOOK_FORWARD_URL=https://script.google.com/macros/s/xxxxx/exec
LINE_WEBHOOK_FORWARD_SECRET=xxxxx
```

- 転送は「テキストメッセージ」を含むリクエストのみ対象です。
- `LINE_WEBHOOK_FORWARD_SECRET` は任意ですが、公開Webhookを保護するため設定を推奨します（受信側で同じHMAC検証を実装してください）。

## Webhook設定（LINE Developers）

Messaging API のWebhook URLを以下に設定します。

- `https://<your-domain>/api/line/webhook`

署名検証を行うため、`LINE_CHANNEL_SECRET` は必須です。

## 設定状況の確認（管理者）

管理者API `GET /api/admin/line/config` で、以下の状態を返します。

- `receivingEnabled`: 受信（Webhook保存）が可能か
- `sendingEnabled`: 送信が可能か
- `webhookUrl`: 現在アクセスしているドメインから推奨Webhook URL

管理画面 `/admin/line` にも同じ情報を表示します。

## Firestoreに保存される主な構造

- `lineConversations/{userId}`
  - `displayName`, `pictureUrl`, `lastMessageAt`, `lastMessageText`, `unreadCount` など
  - 管理画面で顧客を紐付けると `customerId` / `customerName` / `customerEmail` / `customerPhone` も保存
- `lineConversations/{userId}/messages/{messageId}`
  - `direction(in/out)`, `type`, `text`, `timestamp` など

※ 顧客紐付け時は `users/{customerId}` 側にも `lineUserId` / `lineLinkedAt` を保存します（解除時に削除）。

## 管理画面

管理画面メニューの「LINE管理」から以下が可能です。

- 会話一覧（最終メッセージ/未読件数）
- 検索（表示名 / userId / 最終メッセージ）
- タイムライン表示
- 任意: 送信（`LINE_CHANNEL_ACCESS_TOKEN` 設定時）
- 顧客紐付け（顧客検索→リンク/解除）
- 対応ステータス（未対応/対応中/対応済）
- メモ（会話ドキュメントに保存して共有）
- CSV出力（会話単位でローカルにダウンロード）
