# BEE ART ENA ドキュメント

## 📚 ドキュメント一覧

このディレクトリには、BEE ART
ENAプロジェクトに関する包括的なドキュメントが含まれています。

### 1. [プロジェクトドキュメント](./PROJECT_DOCUMENTATION.md)

プロジェクト全体の概要、技術スタック、アーキテクチャ、主要機能について説明しています。

**主な内容：**

- プロジェクト概要
- 技術スタック詳細
- システムアーキテクチャ
- データモデル
- 主要機能一覧
- セキュリティ実装
- パフォーマンス最適化

### 2. [データベース移行ガイド](./DATABASE_MIGRATION_GUIDE.md)

現在のモック実装から本番のFirebaseへ移行するための詳細な手順書です。

**主な内容：**

- Firebase プロジェクトの作成
- 環境変数の設定
- セキュリティルールの実装
- データ移行スクリプト
- トラブルシューティング

### 3. [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)

Vercelを使用した本番環境へのデプロイメント手順を説明しています。

**主な内容：**

- Vercel セットアップ
- 環境変数設定
- カスタムドメイン設定
- CI/CD パイプライン
- モニタリング設定

### 4. [コード品質改善ガイド](./CODE_QUALITY_IMPROVEMENTS.md)

コードベースの品質向上のための改善点と実装提案をまとめています。

**主な内容：**

- 優先度別改善項目
- エラーハンドリング統一
- 入力値検証強化
- パフォーマンス最適化
- コーディング規約

## 🚀 クイックスタート

### 開発環境セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/cyakkunnlove/beeartena-next.git
cd beeartena-next

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local

# 開発サーバーの起動
npm run dev
```

### 本番環境へのデプロイ

```bash
# ビルド確認
npm run build

# 本番環境へプッシュ（自動デプロイ）
git push origin main
```

## 📋 プロジェクト情報

### 現在のバージョン

- **v1.0.0-stable** - 2024年12月（安定版）

### 主な機能

- ✅ ユーザー認証（会員登録・ログイン）
- ✅ 予約管理システム
- ✅ ポイントシステム（5%還元・誕生日特典）
- ✅ 管理者ダッシュボード
- ✅ 休業日設定（定休日・特別休業日）
- ✅ 顧客管理
- ✅ 売上分析

### 技術スタック

- **Frontend**: Next.js 15.4.1, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Deployment**: Vercel
- **Development**: localStorage (モック実装)

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# TypeScriptチェック
npm run type-check

# Lintチェック
npm run lint

# ビルド
npm run build

# 本番モードでの起動
npm start
```

## 📱 デモアカウント

### 管理者アカウント

- Email: admin@example.com
- Password: admin123

### 一般ユーザーアカウント

- Email: test@example.com
- Password: password123

## 🤝 貢献方法

1. Issueを作成して問題や提案を報告
2. Feature branchを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. Branchにプッシュ（`git push origin feature/amazing-feature`）
5. Pull Requestを作成

## 📝 ライセンス

このプロジェクトは、BEE ART ENA専用のプロプライエタリソフトウェアです。

## 📞 お問い合わせ

質問や提案がある場合は、プロジェクトオーナーまでご連絡ください。

---

最終更新: 2024年12月
