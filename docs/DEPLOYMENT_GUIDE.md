# デプロイメントガイド

## 概要

このガイドでは、BEE ART ENAプロジェクトを本番環境にデプロイする手順を説明します。Vercelを使用した自動デプロイメントと、各種環境設定について詳しく解説します。

## デプロイメントアーキテクチャ

```
GitHub Repository
    ↓
Vercel (Auto Deploy)
    ↓
Production Environment
    ├── Next.js Application
    ├── Firebase Services
    │   ├── Authentication
    │   ├── Firestore
    │   └── Storage
    └── CDN (Static Assets)
```

## 前提条件

- GitHubアカウント
- Vercelアカウント
- Firebaseプロジェクト（設定済み）
- ドメイン（オプション）

## デプロイメント手順

### 1. GitHubリポジトリの準備

#### 1.1 リポジトリの作成

```bash
# ローカルリポジトリの初期化（既に完了している場合はスキップ）
git init

# .gitignoreの確認
cat .gitignore
# 以下が含まれていることを確認：
# node_modules/
# .next/
# .env.local
# .env*.local
# npm-debug.log*
# yarn-debug.log*
# yarn-error.log*
```

#### 1.2 リモートリポジトリの接続

```bash
# GitHubで新しいリポジトリを作成後
git remote add origin https://github.com/yourusername/beeartena-next.git
git branch -M main
git push -u origin main
```

### 2. Vercelのセットアップ

#### 2.1 Vercelアカウントの作成

1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでサインアップ
3. GitHubとの連携を承認

#### 2.2 プロジェクトのインポート

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリを選択
3. プロジェクト設定：
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. 環境変数の設定

#### 3.1 Vercelでの環境変数設定

Vercelダッシュボード → Settings → Environment Variables

```bash
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# 本番環境フラグ
NEXT_PUBLIC_USE_FIREBASE=true
NODE_ENV=production

# その他の設定
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### 3.2 環境ごとの変数設定

- **Production**: 本番環境の値
- **Preview**: ステージング環境の値
- **Development**: 開発環境の値

### 4. カスタムドメインの設定

#### 4.1 ドメインの追加

1. Vercel Dashboard → Settings → Domains
2. カスタムドメインを入力
3. DNSレコードの設定：

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 4.2 SSL証明書

Vercelが自動的にLet's Encrypt証明書を発行・管理

### 5. デプロイメント設定

#### 5.1 自動デプロイ設定

`vercel.json`を作成：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin",
      "has": [
        {
          "type": "header",
          "key": "x-user-role",
          "value": "(?!admin)"
        }
      ],
      "destination": "/login",
      "permanent": false
    }
  ]
}
```

#### 5.2 ビルド最適化

`next.config.js`の設定：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
```

### 6. デプロイメントプロセス

#### 6.1 開発環境でのテスト

```bash
# ビルドテスト
npm run build

# 本番環境モードでの起動
npm start

# TypeScriptチェック
npm run type-check

# Lintチェック
npm run lint
```

#### 6.2 ステージングデプロイ

```bash
# featureブランチを作成
git checkout -b feature/new-feature

# 変更をコミット
git add .
git commit -m "Add new feature"

# プッシュ（Preview環境へ自動デプロイ）
git push origin feature/new-feature
```

#### 6.3 本番デプロイ

```bash
# mainブランチにマージ
git checkout main
git merge feature/new-feature

# 本番環境へプッシュ（自動デプロイ）
git push origin main
```

### 7. デプロイ後の確認事項

#### 7.1 機能チェックリスト

- [ ] ユーザー登録・ログイン
- [ ] 予約作成・確認
- [ ] ポイント機能
- [ ] 管理者機能
- [ ] 画像アップロード
- [ ] メール送信（実装時）

#### 7.2 パフォーマンスチェック

```bash
# Lighthouse実行
npx lighthouse https://your-domain.com --view

# 確認項目：
# - Performance: 90以上
# - Accessibility: 90以上
# - Best Practices: 90以上
# - SEO: 90以上
```

#### 7.3 セキュリティチェック

- [ ] HTTPS有効化確認
- [ ] セキュリティヘッダー確認
- [ ] Firebase Security Rules確認
- [ ] 環境変数の漏洩チェック

### 8. モニタリング設定

#### 8.1 Vercel Analytics

1. Vercel Dashboard → Analytics
2. Web Vitalsの監視
3. パフォーマンスメトリクスの確認

#### 8.2 エラートラッキング（推奨）

Sentryの設定例：

```bash
npm install @sentry/nextjs
```

`sentry.client.config.js`:

```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 9. バックアップとリカバリー

#### 9.1 データベースバックアップ

Firebase自動バックアップの有効化：

```bash
# Firebase CLIを使用
firebase firestore:backups:schedules:create \
  --recurrence weekly \
  --retention-days 30
```

#### 9.2 ロールバック手順

```bash
# Vercelダッシュボードから以前のデプロイメントを選択
# または
vercel rollback [deployment-url]
```

### 10. トラブルシューティング

#### 10.1 ビルドエラー

```bash
# ローカルでビルドを再現
npm run build

# キャッシュクリア
rm -rf .next node_modules
npm install
npm run build
```

#### 10.2 環境変数の問題

- Vercelダッシュボードで環境変数を確認
- `NEXT_PUBLIC_`プレフィックスの確認
- デプロイメント後の再ビルド

#### 10.3 パフォーマンス問題

- 画像最適化の確認
- 不要なJavaScriptの削減
- APIレスポンスのキャッシュ設定

## CI/CDパイプライン（オプション）

### GitHub Actions設定

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

## セキュリティベストプラクティス

1. **環境変数管理**
   - 機密情報は必ず環境変数に
   - `.env.local`はGitにコミットしない
   - 定期的なキーローテーション

2. **アクセス制御**
   - Firebase Security Rulesの適切な設定
   - 管理者機能の厳密な制限
   - レート制限の実装

3. **依存関係管理**
   - 定期的な`npm audit`の実行
   - 依存関係の自動更新設定
   - 脆弱性の迅速な対応

## メンテナンス計画

### 定期メンテナンス項目

- [ ] 週次：エラーログ確認
- [ ] 月次：パフォーマンスレポート確認
- [ ] 月次：セキュリティアップデート適用
- [ ] 四半期：依存関係の大規模更新
- [ ] 年次：アーキテクチャレビュー

## サポート情報

- Vercel Status: https://www.vercel-status.com/
- Firebase Status: https://status.firebase.google.com/
- Next.js Documentation: https://nextjs.org/docs
- プロジェクト固有の問題: [GitHub Issues]