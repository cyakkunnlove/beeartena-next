# Vercelデプロイ手順

## 1. Vercelアカウントの準備

1. https://vercel.com にアクセス
2. 「Sign Up」または「Log In」をクリック
3. **「Continue with GitHub」** を選択（重要：GitHubアカウントでログイン）

## 2. 新規プロジェクトの作成

1. Vercelダッシュボードにログイン後、「Add New...」→「Project」をクリック
2. 「Import Git Repository」セクションで：
   - GitHubアカウントが連携されていることを確認
   - `cyakkunnlove/beeartena-next` リポジトリを探して選択
   - 「Import」ボタンをクリック

## 3. プロジェクト設定

以下の設定を確認（通常は自動で正しく設定されます）：

- **Framework Preset**: Next.js
- **Root Directory**: ./（そのまま）
- **Build and Output Settings**:
  - Build Command: `npm run build`
  - Output Directory: （空欄のまま）
  - Install Command: `npm install`

## 4. デプロイ

1. 設定を確認したら「Deploy」ボタンをクリック
2. デプロイが開始されます（通常2-5分程度）
3. 進行状況がリアルタイムで表示されます

## 5. デプロイ完了後

1. **プロジェクトURL**が表示されます
   - 例：`https://beeartena-next-cyakkunnlove.vercel.app`
   - または：`https://beeartena-next.vercel.app`

2. **管理者ログイン情報**：
   - Email: admin@beeartena.jp
   - Password: admin123

## 6. カスタムドメイン（オプション）

独自ドメインを使用する場合：
1. Vercelプロジェクトの「Settings」→「Domains」
2. 「Add」をクリックしてドメインを追加
3. DNS設定の指示に従う

## 7. 継続的デプロイ

- GitHubの`main`ブランチに変更をプッシュすると自動的にデプロイされます
- プルリクエストを作成すると、プレビューデプロイが作成されます

## トラブルシューティング

### ビルドエラーの場合
- Vercelのビルドログを確認
- ローカルで `npm run build` が成功することを確認

### 画像が表示されない場合
- `/public/images/` フォルダの画像が正しくコミットされているか確認

## セキュリティ注意事項

⚠️ **重要**: GitHubのPersonal Access Tokenが公開されてしまった場合は、すぐに以下の手順で無効化してください：

1. GitHub → Settings → Developer settings → Personal access tokens
2. 該当のトークンを見つけて「Delete」または「Revoke」
3. 新しいトークンを生成（必要な場合）