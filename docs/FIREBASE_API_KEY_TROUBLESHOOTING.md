# Firebase APIキーエラー - トラブルシューティングガイド

## エラー: auth/api-key-not-valid

このエラーは以下の原因で発生します：

### 1. Firebase承認済みドメインの設定
✅ **完了済み**: `beeartena-next.vercel.app` がFirebase Consoleの承認済みドメインに追加されました。

### 2. Google Cloud Console APIキーの制限

APIキーが特定のHTTPリファラーに制限されている場合があります。

#### 確認手順：

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com/
   - プロジェクト「beeart-ena」を選択

2. **APIキーの設定を確認**
   - 「APIとサービス」→「認証情報」
   - Web APIキー（Firebase用）を選択
   
3. **アプリケーションの制限を確認**
   - 「アプリケーションの制限」セクションを確認
   - 以下のいずれかに設定されている必要があります：
     - 「なし」（一時的なテスト用）
     - 「HTTPリファラー（ウェブサイト）」の場合、以下を追加：
       ```
       https://beeartena-next.vercel.app/*
       https://beeart-ena.firebaseapp.com/*
       http://localhost:3000/*
       ```

4. **APIの制限を確認**
   - 「APIの制限」セクションで以下のAPIが有効になっているか確認：
     - Identity Toolkit API
     - Firebase Authentication API

### 3. 環境変数の値の確認

環境変数に余分な文字（改行、スペースなど）が含まれていないか確認：

```bash
# Vercelで確認
vercel env pull .env.local.production

# ローカルで値を確認（最初と最後の文字）
cat .env.local.production | grep NEXT_PUBLIC_FIREBASE_API_KEY
```

### 4. Firebase SDKの初期化の問題

現在の設定：
```typescript
// lib/firebase/config.ts
apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key').trim(),
```

`.trim()` で前後の空白を削除していますが、改行文字が含まれている可能性があります。

### 5. 承認済みドメインの反映待ち

Firebase の承認済みドメインは、追加後すぐには反映されない場合があります。
- 通常5-10分で反映されます
- 最大で1時間かかる場合があります

## 推奨される対処法

1. **Google Cloud Console でAPIキーの制限を一時的に「なし」に設定**
   - これでエラーが解消される場合、HTTPリファラーの設定に問題があります

2. **新しいAPIキーを作成**
   - 既存のキーに問題がある場合は、新しいキーを作成してテスト

3. **ブラウザのキャッシュをクリア**
   - 古いキャッシュが原因の可能性があります

4. **別のブラウザやシークレットモードでテスト**
   - ブラウザ固有の問題を排除

## デバッグ情報の収集

デバッグページ（https://beeartena-next.vercel.app/debug/firebase-auth）で以下を確認：
- Firebase設定が正しく読み込まれているか
- APIキーの値が正しいか（最初の数文字を確認）
- エラーコードの詳細

## 次のステップ

1. Google Cloud ConsoleでAPIキーの制限を確認・更新
2. 10-15分待ってから再テスト
3. それでも解決しない場合は、新しいAPIキーを作成してテスト