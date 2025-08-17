# Firebase承認済みドメインの設定手順

## 方法1: Firebase Consoleでの設定（推奨）

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/
   - プロジェクト「beeart-ena」を選択

2. **Authenticationを開く**
   - 左メニューから「Authentication」をクリック

3. **設定タブに移動**
   - 上部タブから「Settings」をクリック

4. **承認済みドメインを追加**
   - 「Authorized domains」タブをクリック
   - 「Add domain」ボタンをクリック
   - 以下のドメインを追加：
     ```
     beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app
     ```

## 方法2: Firebase CLIを使用（自動化）

### 前提条件
Firebase CLIがインストールされている必要があります：
```bash
npm install -g firebase-tools
```

### 手順

1. **Firebase CLIにログイン**
   ```bash
   firebase login
   ```

2. **プロジェクトを選択**
   ```bash
   firebase use beeart-ena
   ```

3. **承認済みドメインを追加するスクリプトを実行**
   以下のコマンドを実行します：

   ```bash
   # Firebaseプロジェクトの設定を取得
   firebase auth:export /tmp/auth-export.json

   # 注意: Firebase CLIには直接承認済みドメインを追加するコマンドがないため、
   # Google Cloud SDKを使用する必要があります
   ```

## 方法3: Google Cloud SDK経由（上級者向け）

### 前提条件
Google Cloud SDKがインストールされている必要があります。

### 手順

```bash
# Google Cloudにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project beeart-ena

# Identity Toolkitの設定を更新
gcloud identity-toolkit config update \
  --authorized-domains="localhost,beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app"
```

## 確認方法

設定が完了したら、以下で確認できます：

1. Firebase Console → Authentication → Settings → Authorized domains
2. リストに以下が含まれていることを確認：
   - `localhost`（開発環境用）
   - `beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app`（本番環境）

## トラブルシューティング

### エラー: "auth/unauthorized-domain"
このエラーが表示される場合は、ドメインが正しく追加されていません。
上記の手順を再度確認してください。

### カスタムドメインを使用する場合
カスタムドメイン（例: www.beeartena.jp）を使用する場合は、
そのドメインも承認済みドメインに追加する必要があります。

## 重要な注意事項

- デフォルトで`localhost`は承認されているはずですが、確認してください
- Vercelのプレビューデプロイメント用に`*.vercel.app`を追加することも検討してください
- 承認済みドメインの変更は即座に反映されます（再デプロイ不要）