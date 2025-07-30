# Firebase Google認証設定手順

## 現在の問題
- Firebase APIキーエラー: `auth/api-key-not-valid`
- Firestoreパーミッションエラー: `PERMISSION_DENIED`

## 解決手順

### 1. Firebaseコンソールでの設定

1. **Firebaseコンソールにアクセス**
   - https://console.firebase.google.com
   - プロジェクト「beeart-ena」を選択

2. **Google認証を有効化**
   - 左側メニューから「Authentication」を選択
   - 「Sign-in method」タブをクリック
   - 「Google」をクリックして有効化
   - プロジェクトのサポートメールを設定
   - 「保存」をクリック

3. **Firestoreセキュリティルールを更新**
   - 左側メニューから「Firestore Database」を選択
   - 「ルール」タブをクリック
   - 開発用に以下のルールを設定：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // 開発環境用：すべての読み書きを許可
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   - 「公開」をクリック

4. **APIキーの確認**
   - プロジェクトの設定（歯車アイコン）をクリック
   - 「プロジェクトの設定」を選択
   - 「全般」タブで「ウェブAPIキー」を確認
   - 現在の.env.localのAPIキーと一致しているか確認

### 2. Google Cloud Consoleでの設定（必要な場合）

1. **Google Cloud Console**
   - https://console.cloud.google.com
   - Firebaseプロジェクトと同じプロジェクトを選択

2. **OAuth同意画面の設定**
   - 「APIとサービス」→「OAuth同意画面」
   - アプリケーション名、サポートメール、ドメインを設定
   - 「保存」

3. **認証情報の確認**
   - 「APIとサービス」→「認証情報」
   - OAuth 2.0クライアントIDが作成されているか確認

### 3. ローカル環境での確認

1. **環境変数の確認**
   ```bash
   # .env.localファイルを確認
   NEXT_PUBLIC_FIREBASE_API_KEY=正しいAPIキー
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beeart-ena.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=beeart-ena
   ```

2. **開発サーバーの再起動**
   ```bash
   npm run dev
   ```

### 4. テスト手順

1. http://localhost:3000/register にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択してログイン
4. 正常にマイページにリダイレクトされることを確認

## トラブルシューティング

### APIキーエラーが続く場合
1. Firebaseコンソールで新しいWebアプリを追加
2. 新しいAPIキーを取得
3. .env.localを更新

### ポップアップがブロックされる場合
1. ブラウザの設定でポップアップを許可
2. または`signInWithRedirect`を使用するように変更

## 本番環境への移行時の注意

1. **Firestoreセキュリティルールを本番用に変更**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // ユーザー自身のデータのみアクセス可能
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // 予約データ
       match /reservations/{document=**} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
         allow update: if request.auth != null && 
           (request.auth.uid == resource.data.userId || 
            request.auth.token.role == 'admin');
       }
     }
   }
   ```

2. **承認済みドメインの追加**
   - Firebaseコンソール → Authentication → Settings → 承認済みドメイン
   - 本番環境のドメインを追加