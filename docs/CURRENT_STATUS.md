# 現状まとめ（BeeArtEna Next）

最終更新: 2025-12-16  
対象ブランチ: `main`  
最終コミット: `7bff343`（fix(auth): show error cause and request id）

## 1. 目的
- 「今どこまでできていて、何が前提で、次に何をすればいいか」をすぐ把握するためのメモです。
- LINE/予約/管理画面/認証（ログイン）など、運用に影響が大きい部分を優先して記載しています。

## 2. 本番・運用の前提
- Hosting: Vercel（`www.beeartena.com`）
- DB: Firestore
- Auth: Firebase Authentication（メール/パスワード + Google）
- Cache/Queue/RateLimit: Redis（Upstash）
- LINE: LINE公式アカウント（Messaging API / Webhook）
- 重要: LINE画像保存で Firebase Storage を使う場合、プロジェクトの課金（Blaze）が必要になるケースがあります。

## 3. 現在の大きな機能（ざっくり）
### 顧客向け
- 予約フロー（カレンダー → 日付 → 時間枠 → 予約作成）
- 会員登録 / ログイン / Googleログイン
- プロフィール編集

### 管理者向け（`/admin`）
- 予約管理、顧客管理、設定（予約設定/営業時間など）、監査ログ（`/admin/audit`）
- LINE管理（会話一覧/タイムライン/検索/顧客紐付け/送信/メディア表示）

## 4. LINE（会話保存・顧客紐付け・送信・画像）
### 4.1 Webhook
- Webhook URL は `https://www.beeartena.com/api/line/webhook`
- 受信保存（Webhookで会話を溜める）には `LINE_CHANNEL_SECRET` が必須です（署名検証）

### 4.2 Firestore構造（概略）
- `lineConversations/{lineUserId}`: 会話のメタ情報（最終メッセージ時刻、顧客紐付け等）
- `lineConversations/{lineUserId}/messages/{messageId}`: メッセージ本体（テキスト/画像/動画 等）

### 4.3 顧客紐付けの考え方
- 管理者が LINE の `userId` を手入力で知る必要は基本ありません。
  - 1通目が送られて Webhook が入れば、`lineUserId`（例: `Uxxxxxxxx...`）が会話として保存されます。
- その会話を「どの顧客に紐づけるか」を管理画面で選んでリンクします（運用を楽にするための機能）。

### 4.4 画像/動画の保存と表示
- 保存先: Firebase Storage（例: `line-media/<lineUserId>/<file>`）
- 必要な環境変数:
  - `LINE_CHANNEL_ACCESS_TOKEN`（メディア取得/送信に必要）
  - `FIREBASE_ADMIN_*`（Admin SDK）
  - `FIREBASE_ADMIN_STORAGE_BUCKET` または `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- 画像が `[image]` のままになる場合:
  - 保存（アップロード）に失敗している可能性が高いです（Storage設定/課金/バケット名）。
  - 管理画面の「再取得」ボタンは `POST /api/admin/line/media/refetch` を叩き、LINE→Storageへ再保存します。

### 4.5 送信（管理画面→LINE）
- 送信は `LINE_CHANNEL_ACCESS_TOKEN` が設定されている時のみ動作します。
- 本番で動かない場合は、Vercel の **Production** 環境変数に入っているかを最優先で確認します（Previewだけだと本番で送れません）。

### 4.6 詳細ドキュメント
- 詳細は `docs/LINE_INTEGRATION.md` を参照してください（必要env/設定手順/注意点）。

## 5. 予約の重さ（`/api/reservations/availability` のタイムアウト）
### 5.1 事象
- `GET /api/reservations/availability?year=YYYY&month=MM` が 504（Vercel `FUNCTION_INVOCATION_TIMEOUT`）になることがありました。

### 5.2 方針（UXと負荷のバランス）
- 月間カレンダーでは「満席判定」までやると重くなりやすいです。
- 現状は「営業時間ベースの軽い結果（fallback）」を返し、実際の満席判定は日付選択後の時間枠取得で行う設計に寄せています。
- APIが fallback で返した場合は `warning` を返し、フロントで注意表示できるようにしています。

## 6. 予約設定（営業時間 vs 予約枠のバリデーション）
### 6.1 事象
- 「営業時間(18:00-19:00)が予約枠(180分)より短い」等のバリデーションで保存が通らないケースがありました。

### 6.2 運用で合わせる（追加開発なしのおすすめ）
- 管理画面の営業時間は「施術終了まで含む時間」にする（例: 最終受付が 19:00 で施術 180分なら close を 22:00 など）
- その上で「開始できる時間」だけ絞る（例: allowedSlots を `18:00`, `19:00` のみにする）

## 7. 認証（ログイン/登録）のエラーを“原因が分かる形”で表示
### 7.1 目的
- 失敗時に「何が原因か」をユーザー/管理者が把握できるようにしてUXを改善する。
- 問い合わせ時に追跡できるよう `requestId`（VercelのID等）も表示する。

### 7.2 仕組み（概要）
- APIレスポンスに `code` と `requestId` を付与（例: `AUTH_INVALID_CREDENTIALS`）
- フロント（`/login`、`/register`、ログインモーダル、Googleログイン）でヒント + `code/id` を表示
- 実装は `lib/api/client.ts` の `ApiError` / `isApiError` が基盤です

### 7.3 主なエラーコード例
- `AUTH_INVALID_CREDENTIALS`: メール/パスワード不一致
- `AUTH_EMAIL_IN_USE`: 既に登録済みメール
- `AUTH_WEAK_PASSWORD`: パスワードが弱い（8文字未満など）
- `RATE_LIMITED`: レート制限
- `AUTH_SERVER_MISCONFIG`: サーバー設定不備（例: `JWT_SECRET` 未設定）

### 7.4 セキュリティ注意
- 登録APIでリクエスト本文（パスワード含む）をログ出力していた箇所は削除済み（再発防止）。

## 8. 環境変数チェックリスト（本番/Vercel）
### 8.1 Firebase（Client）
- `NEXT_PUBLIC_FIREBASE_*` 一式（特に `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`）

### 8.2 Firebase（Admin SDK）
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- （必要に応じて）`FIREBASE_ADMIN_STORAGE_BUCKET`

#### `FIREBASE_ADMIN_PRIVATE_KEY` の貼り付け形式
- Firebase Console → プロジェクト設定 → サービスアカウント → 「新しい秘密鍵を生成」
- JSONの `private_key` の値（`-----BEGIN PRIVATE KEY-----` 〜 `-----END PRIVATE KEY-----`）を環境変数に入れます。
- このリポジトリでは `\\n` を `\n` に変換する実装になっているため、以下どちらでも動きます:
  - 改行を含む形で貼り付け
  - `\n` を含む1行の形で貼り付け（VercelのUIで扱いやすい）

### 8.3 LINE
- `LINE_CHANNEL_SECRET`（Webhook受信保存に必須）
- `LINE_CHANNEL_ACCESS_TOKEN`（送信/メディア再取得に必須）

### 8.4 Redis（任意だが推奨）
- `REDIS_URL`（Upstashの接続URL）
  - 未設定の場合はメモリfallbackになるため、本番では設定推奨です（性能/安定性のため）。

## 9. Vercel Toolbar について
- Vercel Toolbar は、Vercelにログイン済みの開発者が確認している時などに表示されることがあります。
- 通常、一般ユーザー（顧客）には表示されませんが、心配な場合は Vercel Project Settings で Toolbar を無効化できます。

## 10. Git運用（混乱しないための最低限ルール）
1. 必ずブランチを切る（例: `git switch -c feat/xxx`）
2. 変更を小さくまとめる（目的ごとにコミット）
3. `npm run build` が通ることを確認してから push
4. PR→マージ（可能ならSquash）→ ブランチ削除

例（基本形）:
```bash
git switch -c feat/something
git add -A
git commit -m "feat: something"
git push -u origin feat/something
```

## 11. 未完了/要確認（運用しながら詰める）
- ポイント関連の文言/導線が残っていないかの最終棚卸し（トップページ等）
- 管理画面のUX改善（セクション折りたたみ、保存通知の出し方、Service Plan編集のモーダル化など）
