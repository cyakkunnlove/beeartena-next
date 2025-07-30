# Firebase Authentication 400エラー デバッグガイド

## 問題の概要
本番環境でユーザー登録時に400エラーが発生している問題のデバッグ手順です。

## 1. デバッグ手順

### A. サーバーサイドのデバッグ

1. **環境変数の確認**
   ```bash
   # .env.localファイルをチェック
   cat .env.local | grep FIREBASE
   ```

2. **デバッグスクリプトの実行**
   ```bash
   # 環境変数を読み込んで実行
   node -r dotenv/config scripts/debug-firebase-registration.js
   ```

### B. クライアントサイドのデバッグ

1. **デバッグページにアクセス**
   - 開発環境: `http://localhost:3000/debug/firebase-auth`
   - 本番環境: `https://your-domain.com/debug/firebase-auth`

2. **デバッグページで以下をテスト**
   - 「設定確認」ボタン: Firebase設定が正しく読み込まれているか確認
   - 「直接登録テスト」ボタン: Firebase Auth に直接アクセスしてテスト
   - 「APIテスト」ボタン: API エンドポイント経由でテスト

### C. 本番環境（Vercel）の確認事項

1. **環境変数の設定確認**
   Vercel ダッシュボードで以下の環境変数が設定されているか確認:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`

2. **Firebase コンソールの確認**
   - Authentication > Sign-in method で「メール/パスワード」が有効になっているか
   - プロジェクト設定 > 全般 で本番ドメインが承認済みドメインに追加されているか
   - Authentication > Settings > Authorized domains に本番ドメインが含まれているか

## 2. よくあるエラーと対処法

### エラー: `auth/invalid-api-key`
**原因**: API キーが無効または設定されていない
**対処法**: 
- Vercel の環境変数に `NEXT_PUBLIC_FIREBASE_API_KEY` が正しく設定されているか確認
- 値の前後に余分なスペースや改行がないか確認

### エラー: `auth/project-not-found`
**原因**: プロジェクトIDが間違っている
**対処法**: 
- Firebase コンソールでプロジェクトIDを確認
- 環境変数の `NEXT_PUBLIC_FIREBASE_PROJECT_ID` と `FIREBASE_ADMIN_PROJECT_ID` が一致しているか確認

### エラー: `auth/network-request-failed`
**原因**: ネットワークエラーまたはCORSの問題
**対処法**: 
- Firebase コンソールで本番ドメインが承認済みドメインに追加されているか確認
- ブラウザのコンソールでCORSエラーがないか確認

### エラー: `auth/operation-not-allowed`
**原因**: メール/パスワード認証が無効
**対処法**: 
- Firebase コンソール > Authentication > Sign-in method でメール/パスワードを有効化

## 3. ログの確認方法

### Vercel のログ確認
1. Vercel ダッシュボード > Functions タブ
2. `/api/auth/register` 関数のログを確認
3. エラーの詳細を確認

### ブラウザコンソール
1. 開発者ツールを開く（F12）
2. Console タブでエラーメッセージを確認
3. Network タブで `/api/auth/register` リクエストの詳細を確認

## 4. 改善された機能

### エラーログの詳細化
- `/app/api/auth/register/route.ts`: より詳細なエラーログを出力
- `/lib/firebase/auth.ts`: Firebase固有のエラーコードを適切に処理

### デバッグツール
- `/scripts/debug-firebase-registration.js`: サーバーサイドのFirebase設定をテスト
- `/app/debug/firebase-auth/page.tsx`: クライアントサイドからFirebaseをテスト

## 5. 次のステップ

1. 上記のデバッグ手順を実行してエラーの詳細を確認
2. エラーメッセージに基づいて対処法を実施
3. 問題が解決しない場合は、Firebase サポートに問い合わせ

## 6. セキュリティ注意事項

- デバッグページは本番環境では無効化することを推奨
- 環境変数の値をログに出力する際は、一部のみ表示するようにする
- デバッグ完了後は、詳細なエラーログを本番環境では無効化する