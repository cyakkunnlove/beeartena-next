# Firebase管理者ユーザー手動作成ガイド

## ステップ1: Firebase Consoleでユーザー作成

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/
   - プロジェクト「beeart-ena」を選択

2. **Authenticationでユーザー作成**
   - 左メニューから「Authentication」をクリック
   - 上部の「Users」タブが選択されていることを確認
   - 右上の「Add user」ボタンをクリック
   - 以下を入力：
     - Email: `admin@beeartena.jp`
     - Password: `BeeArtEna2024Admin!`
   - 「Add user」をクリック

3. **作成されたユーザーのUIDをコピー**
   - ユーザー一覧に表示される admin@beeartena.jp の行をクリック
   - 「User UID」の値をコピー（例: AbCdEfGhIjKlMnOpQrStUvWxYz）

## ステップ2: Firestoreでrole設定

1. **Firestore Databaseにアクセス**
   - 左メニューから「Firestore Database」をクリック

2. **usersコレクションを作成（存在しない場合）**
   - 「Start collection」をクリック
   - Collection ID: `users`
   - 「Next」をクリック

3. **管理者ドキュメントを作成**
   - Document ID: コピーしたUID（例: AbCdEfGhIjKlMnOpQrStUvWxYz）
   - 以下のフィールドを追加：

   | Field | Type | Value |
   |-------|------|-------|
   | id | string | コピーしたUID |
   | email | string | admin@beeartena.jp |
   | name | string | 管理者 |
   | phone | string | 090-0000-0000 |
   | role | string | admin |
   | createdAt | timestamp | （現在時刻を選択） |
   | updatedAt | timestamp | （現在時刻を選択） |

4. **保存**
   - 「Save」をクリック

## ステップ3: アプリケーションの設定

1. **環境変数を更新**
   ```bash
   # .env.localを編集
   NEXT_PUBLIC_USE_FIREBASE=true
   ```

2. **開発サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **ログインテスト**
   - http://localhost:3000/login にアクセス
   - Email: admin@beeartena.jp
   - Password: BeeArtEna2024Admin!

## トラブルシューティング

### ログインできない場合

1. **Firebase Authenticationの確認**
   - Authenticationでユーザーが作成されているか確認
   - パスワードが正しいか確認

2. **Firestoreの確認**
   - users/[UID]ドキュメントが存在するか確認
   - roleフィールドが "admin" になっているか確認

3. **環境変数の確認**
   - NEXT_PUBLIC_USE_FIREBASE=true になっているか確認
   - Firebase設定が正しいか確認

### エラーメッセージ別対処法

- **"ユーザーが見つかりません"**: Authenticationにユーザーが作成されていない
- **"パスワードが正しくありません"**: パスワードを確認
- **"ユーザー情報が見つかりません"**: Firestoreにドキュメントがない

## 注意事項

- 管理者パスワードは安全に管理してください
- 本番環境では別の強力なパスワードを使用してください
- Firestoreのセキュリティルールで管理者権限を適切に設定してください