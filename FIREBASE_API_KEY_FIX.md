# Firebase API キー修正手順

## 問題
Firebase API キー `AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA` が無効で、新規登録ができません。
　　　　　　　　　　　AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA
## 修正手順

### 1. Firebase Console での確認
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「beeart-ena」を選択
3. **プロジェクト設定**（歯車アイコン）→ **全般** タブ
4. Web APIキーが正しいか確認

### 2. Google Cloud Console でのAPI有効化
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト「beeart-ena」を選択
3. **APIとサービス** → **有効なAPI** をクリック
4. 以下のAPIを検索して有効化：
   - **Identity Toolkit API**
   - **Firebase Authentication API**

### 3. APIキーの制限設定
1. Google Cloud Console → **APIとサービス** → **認証情報**
2. 該当するAPIキーをクリック
3. **アプリケーションの制限** セクション：
   - 「HTTPリファラー（ウェブサイト）」を選択
   - 以下を追加：
     ```
     http://localhost:3000/*
     http://localhost:3001/*
     http://localhost/*
     https://your-domain.vercel.app/*
     ```

### 4. Firebase Authentication 設定
1. Firebase Console → **Authentication** → **Sign-in method**
2. **メール/パスワード** プロバイダを有効化
3. **Settings** → **Authorized domains**
4. 以下のドメインを追加：
   - `localhost`
   - 本番ドメイン（Vercelのドメイン）

### 5. 新しいAPIキーの生成（必要な場合）
もし上記の手順で解決しない場合：

1. Firebase Console → プロジェクト設定 → 全般
2. 「Web APIキー」の横にある「再生成」ボタンをクリック
3. 新しいAPIキーを `.env.local` に設定：
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=新しいAPIキー
   ```

### 6. 動作確認
1. 開発サーバーを再起動
2. http://localhost:3000/debug/firebase-auth でテスト
3. 新規登録を試す

## トラブルシューティング

### エラー: "API key not valid"
- Google Cloud ConsoleでAPIキーの制限を確認
- Identity Toolkit APIが有効か確認

### エラー: "auth/network-request-failed"
- CORSの問題の可能性
- Firebase Authorized domainsにlocalhostが追加されているか確認

### エラー: "auth/operation-not-allowed"
- Firebase Authenticationでメール/パスワード認証が有効か確認

## 注意事項
- APIキーを変更した場合は、本番環境（Vercel）の環境変数も更新が必要
- Firebase Admin SDKは正常に動作しているので、クライアントサイドの設定のみの問題