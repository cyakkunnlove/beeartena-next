# デモ環境セットアップ手順（Vercel + Firebase）

目的: 本番と完全分離した「デモ用データ」環境を用意する。

---

## 1. Firebase プロジェクトを新規作成
1. Firebase Console で新規プロジェクトを作成（例: `cocokarte-demo`）
2. Authentication を有効化（Email/Password）
3. Firestore を有効化
4. サービスアカウント鍵（JSON）を発行

---

## 2. 環境変数（デモ専用）
Vercel の **別プロジェクト** で環境変数を設定する。

必須（Client）:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_SITE_URL`（例: `https://cocokarte-demo.vercel.app`）
- `NEXT_PUBLIC_DEMO_MODE=true`

必須（Admin）:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

推奨:
- `ADMIN_PASSWORD`（デモ管理者パスワード）
- `JWT_SECRET`
- `REDIS_URL`（必要なら）
- `RESEND_API_KEY`（メール送信が必要な場合）

※ 本番と同じFirebaseプロジェクトは使わないこと。

---

## 3. 管理者ユーザーの作成
デモ用Firebaseに対して管理者ユーザーを作成する。

```bash
node scripts/admin-init.js
```

※ `ADMIN_PASSWORD` を設定しておくと、管理者の初期パスワードが固定できます。

---

## 4. デモデータの投入

```bash
npm run firebase:seed:all
```

---

## 5. Vercel デプロイ（別プロジェクト）
1. Vercelで `beeartena-next` を **別プロジェクト** としてインポート  
2. 上記のデモ用環境変数を設定  
3. デプロイ

---

## 6. noindex 確認
`NEXT_PUBLIC_DEMO_MODE=true` の場合:
- 画面上部に「デモ環境」バナーが表示
- `X-Robots-Tag: noindex, nofollow` が付与される

---

## 7. 共有方法の例
1. LPの「デモ・ご相談はこちら」からデモURLへ遷移
2. ログインID/パスワードはフォーム完了後に個別共有
3. Zoomデモ専用として運用も可能
