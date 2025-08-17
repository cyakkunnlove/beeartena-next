# Firebase承認済みドメインの設定

## 問題
本番環境で「auth/api-key-not-valid」エラーが発生している場合、Firebaseの承認済みドメインに本番ドメインが追加されていない可能性があります。

## 解決方法

1. **Firebaseコンソールにアクセス**
   - https://console.firebase.google.com/
   - プロジェクト「beeart-ena」を選択

2. **Authentication設定を開く**
   - 左側メニューから「Authentication」を選択
   - 「Settings」タブをクリック

3. **承認済みドメインを確認・追加**
   - 「Authorized domains」セクションを確認
   - 以下のドメインが追加されているか確認：
     - `beeartena-next.vercel.app`
     - `localhost` (開発用)
   
4. **ドメインを追加**
   - 「Add domain」をクリック
   - `beeartena-next.vercel.app` を入力
   - 「Add」をクリック

5. **APIキーの制限を確認**
   - Google Cloud Console (https://console.cloud.google.com/)
   - 「APIとサービス」→「認証情報」
   - Firebase用のAPIキーを選択
   - 「アプリケーションの制限」が「ウェブサイト」の場合：
     - HTTPリファラーに以下を追加：
       - `https://beeartena-next.vercel.app/*`
       - `http://localhost:3000/*` (開発用)

## 確認方法
設定後、デバッグページ（https://beeartena-next.vercel.app/debug/firebase-auth）で再度テストを実行してください。

## 注意事項
- ドメイン追加後、反映まで数分かかる場合があります
- カスタムドメインを使用する場合は、そのドメインも追加が必要です