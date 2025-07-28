# デプロイメント手順

## GitHubリポジトリの作成

1. [GitHub](https://github.com) にログイン
2. 右上の「+」ボタンから「New repository」を選択
3. 以下の設定でリポジトリを作成：
   - Repository name: `beeartena-next`
   - Description:
     `Bee Artena - アイブロウアートメイク専門サロンのウェブアプリケーション`
   - Public を選択
   - その他はデフォルトのまま

4. リポジトリ作成後、ローカルリポジトリと連携：

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/[your-username]/beeartena-next.git

# mainブランチにプッシュ
git branch -M main
git push -u origin main
```

## Vercelへのデプロイ

1. [Vercel](https://vercel.com) にログイン（GitHubアカウントでログイン推奨）

2. 「New Project」をクリック

3. GitHubリポジトリから `beeartena-next` を選択

4. 設定を確認：
   - Framework Preset: Next.js（自動検出される）
   - Root Directory: そのまま
   - Build Command: `npm run build`
   - Output Directory: そのまま
   - Install Command: `npm install`

5. 「Deploy」をクリック

6. デプロイ完了後、提供されたURLでアプリケーションにアクセス可能

## 環境変数（将来的に必要な場合）

Vercelのプロジェクト設定から環境変数を追加：

```
# 例（現在は不要）
DATABASE_URL=your-planetscale-url
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## カスタムドメインの設定

1. Vercelプロジェクトの「Settings」→「Domains」
2. カスタムドメインを追加
3. DNSレコードを設定

## 継続的デプロイ

- `main` ブランチへのプッシュで自動的にプロダクションにデプロイ
- プルリクエストでプレビューデプロイが作成される

## トラブルシューティング

### ビルドエラーの場合

1. ローカルで `npm run build` を実行して確認
2. TypeScriptエラーがないか確認
3. 依存関係が正しくインストールされているか確認

### 画像が表示されない場合

- `public/images/` フォルダの画像がコミットされているか確認
- Next.js の Image コンポーネントのドメイン設定を確認
