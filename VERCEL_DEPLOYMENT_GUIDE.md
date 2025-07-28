# Vercelデプロイメントガイド

## 🚀 Vercelへのデプロイ手順

### 1. Vercelアカウントの準備

1. [Vercel](https://vercel.com) にアクセス
2. GitHubアカウントでサインイン

### 2. プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」を選択
3. GitHubリポジトリ `beeartena-next` を選択
4. 「Import」をクリック

### 3. 環境変数の設定

Vercelのプロジェクト設定で以下の環境変数を設定：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
JWT_SECRET=your-secret-jwt-key-change-this
NEXT_PUBLIC_API_URL=https://your-project.vercel.app
```

### 4. デプロイ設定

- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: ./（そのまま）
- **Build Command**: `npm run build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）

### 5. デプロイ実行

1. 「Deploy」ボタンをクリック
2. デプロイが完了するまで待機（約2-3分）
3. デプロイ完了後、プロジェクトURLが表示される

## 📝 Firebase未設定での動作

Firebase環境変数が未設定でも、モックモードで動作します：

- テスト用データで全機能が利用可能
- 管理者ログイン: admin@beeartena.jp / admin123

## 🔧 トラブルシューティング

### ビルドエラーが発生する場合

1. Node.jsバージョンを確認（18.x推奨）
2. `package-lock.json`を削除して再ビルド

### 環境変数が反映されない場合

1. Vercelダッシュボード → Settings → Environment Variables
2. 変更後は再デプロイが必要

### カスタムドメインの設定

1. Settings → Domains
2. ドメインを追加してDNS設定を更新

## 🌐 デプロイ後の確認事項

1. **アクセス確認**
   - https://your-project.vercel.app
   - モバイル表示の確認

2. **機能テスト**
   - ユーザー登録・ログイン
   - 予約作成・キャンセル
   - 管理画面へのアクセス

3. **パフォーマンス**
   - Lighthouse スコアの確認
   - Core Web Vitalsの測定

## 📊 Vercel Analytics

無料プランでも基本的な分析が可能：

- ページビュー
- 訪問者数
- パフォーマンスメトリクス

## 🔄 継続的デプロイメント

GitHubにプッシュすると自動的に再デプロイされます：

- `main`ブランチ → 本番環境
- その他のブランチ → プレビュー環境

## 📞 サポート

問題が発生した場合：

1. [Vercel Documentation](https://vercel.com/docs)
2. [Next.js Documentation](https://nextjs.org/docs)
3. プロジェクトのissuesセクション
