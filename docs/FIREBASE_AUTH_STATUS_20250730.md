# Firebase認証問題 - 現在の状況 (2025/07/30)

## 問題の概要
本番環境（https://beeartena-next.vercel.app）でユーザー登録時に「auth/api-key-not-valid」エラーが発生している。

## 確認済み事項

### ✅ サーバーサイド（Firebase Admin SDK）
- **正常動作**: サーバーサイドのFirebase Admin SDKは正常に動作
- テストスクリプト `scripts/debug-firebase-registration.js` で確認済み
- ユーザーの作成、Firestoreへの書き込み、削除すべて成功

### ✅ Firebase承認済みドメイン
- `beeartena-next.vercel.app` が追加済み（ユーザーにより確認）
- Firebase Console > Authentication > Settings > Authorized domains

### ✅ 環境変数
- Vercel環境変数はすべて設定済み
- APIキーの値は正しい（AIzaSyBXYa8FeHyHQa0j...）

### ❌ クライアントサイドFirebase認証
- エラー: `auth/api-key-not-valid.-please-pass-a-valid-api-key.`
- デバッグページ、通常の登録ページ両方で同じエラー

## 残る問題の可能性

### 1. Google Cloud Console APIキーの制限
**最も可能性が高い原因**

APIキーに「HTTPリファラー」制限が設定されている場合、以下を追加する必要があります：
```
https://beeartena-next.vercel.app/*
https://beeart-ena.firebaseapp.com/*
```

### 2. Firebase SDKの初期化タイミング
現在は問題ないはずだが、念のため確認が必要。

### 3. APIキーの有効化
Identity Toolkit APIが有効になっているか確認が必要。

## 推奨される次のステップ

1. **Google Cloud Consoleでの確認・設定**
   - https://console.cloud.google.com/
   - プロジェクト「beeart-ena」を選択
   - 「APIとサービス」→「認証情報」
   - Web APIキー（Firebase用）の設定を確認
   - 「アプリケーションの制限」を一時的に「なし」に設定してテスト

2. **設定変更後**
   - 5-10分待つ（反映に時間がかかる場合がある）
   - ブラウザのキャッシュをクリア
   - シークレットモードで再テスト

3. **それでも解決しない場合**
   - 新しいAPIキーを作成
   - Firebase Supportに問い合わせ

## テスト環境
- デバッグページ: https://beeartena-next.vercel.app/debug/firebase-auth
- 通常の登録ページ: https://beeartena-next.vercel.app/register

## エラーログ
```
[2025-07-30T11:30:04.245Z] ❌ エラー発生: auth/api-key-not-valid.-please-pass-a-valid-api-key.
[2025-07-30T11:30:04.245Z] エラーメッセージ: Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.).
```