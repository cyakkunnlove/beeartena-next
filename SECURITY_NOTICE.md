# ⚠️ セキュリティ通知 - 緊急対応が必要

## 問題

GitHubから、公開リポジトリにAPIキーが含まれているとの警告を受けました。

## 実施した対応

1. APIキーを含むドキュメントの編集（FIREBASE_CONFIG_MISSING.md）
2. `.env.local` は `.gitignore` に含まれているため安全

## 🚨 今すぐ実施が必要な作業

### 1. Firebase APIキーの無効化と再生成

1. [Firebase Console](https://console.firebase.google.com/project/beeart-ena/settings/general)
   にアクセス
2. プロジェクトの設定 → 全般
3. WebアプリのAPIキーを確認
4. Google Cloud Console で該当のAPIキーを無効化
5. 新しいAPIキーを生成

### 2. ローカルの `.env.local` を更新

```bash
# .env.localを編集
nano .env.local

# 以下の値を新しいものに更新
NEXT_PUBLIC_FIREBASE_API_KEY=新しいAPIキー
```

### 3. Vercelの環境変数を更新

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクト設定 → Environment Variables
3. `NEXT_PUBLIC_FIREBASE_API_KEY` を新しい値に更新

## 📝 重要な注意事項

1. **機密情報を公開リポジトリにコミットしない**
   - APIキー、シークレット、パスワードは `.env.local` に保存
   - `.env.local` は `.gitignore` に含める（既に対応済み）
   - サンプルファイルには実際の値を含めない

2. **環境変数の管理**
   - 開発環境: `.env.local` ファイル
   - 本番環境: Vercel の環境変数設定

3. **セキュリティベストプラクティス**
   - APIキーには最小限の権限のみ付与
   - 定期的にキーをローテーション
   - GitGuardian等のツールで監視

## ✅ 今後の予防策

1. コミット前に機密情報が含まれていないか確認
2. `git-secrets` などのツールを使用してプリコミットフックを設定
3. 環境変数の命名規則を統一（`NEXT_PUBLIC_` は公開可能な値のみ）
