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

## Webhook設定（LINE Developers）

Messaging API のWebhook URLを以下に設定します。

- `https://<your-domain>/api/line/webhook`

署名検証を行うため、`LINE_CHANNEL_SECRET` は必須です。

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
