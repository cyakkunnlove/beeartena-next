# Vercel CLIデプロイメント手順

## 🚀 Vercel CLIでのデプロイとログ確認

### 1. Vercel CLIでプロジェクトをリンク
```bash
cd "/Users/takuyakatou/Library/CloudStorage/OneDrive-個人用/デスクトップ/beeartena-next"
vercel link
```

### 2. デプロイの実行
```bash
# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

### 3. ログの確認
```bash
# 最新のデプロイログを表示
vercel logs

# ビルドログを表示
vercel logs --since 10m

# エラーのみ表示
vercel logs --error
```

### 4. デプロイ状況の確認
```bash
# デプロイリストを表示
vercel ls

# 特定のデプロイの詳細を表示
vercel inspect [deployment-url]
```

## 📝 環境変数の設定

### CLIから環境変数を設定
```bash
# 環境変数を追加
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY

# 環境変数一覧を表示
vercel env ls

# 環境変数を削除
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY
```

## 🔧 トラブルシューティング

### ビルドエラーの詳細確認
```bash
# 最新のビルドログを取得
vercel logs --output raw > build.log

# エラー部分を抽出
grep -A 10 -B 10 "error\|Error\|failed" build.log
```

### ローカルでVercelビルドを再現
```bash
# Vercelと同じ環境でビルド
vercel build

# ローカルでプレビュー
vercel dev
```

## 🔄 自動デプロイの無効化

GitHubプッシュ時の自動デプロイを一時的に無効化：
```bash
vercel git disconnect
```

再度有効化：
```bash
vercel git connect
```