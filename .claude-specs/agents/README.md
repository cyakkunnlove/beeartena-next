# Bee Artena プロジェクト専用エージェント

このディレクトリには、Bee
Artenaプロジェクトの開発を効率化するための専門エージェントが定義されています。

## エージェント一覧

### 1. Frontend UI Agent (`frontend-ui-agent.md`)

- **役割**: フロントエンド開発とUI/UX改善
- **技術**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **責任**: コンポーネント開発、スタイリング、アニメーション、レスポンシブ対応

### 2. Backend API Agent (`backend-api-agent.md`)

- **役割**: バックエンドAPI開発とサーバーサイドロジック
- **技術**: Next.js API Routes, TypeScript, bcryptjs, jose
- **責任**: API開発、認証システム、データ管理、セキュリティ

### 3. Database Migration Agent (`database-migration-agent.md`)

- **役割**: データベース設計と移行管理
- **技術**: PlanetScale, Prisma ORM（予定）, MySQL
- **責任**: スキーマ設計、マイグレーション、パフォーマンス最適化

### 4. Testing & Quality Agent (`testing-quality-agent.md`)

- **役割**: テスト戦略と品質保証
- **技術**: Jest, React Testing Library, Cypress, ESLint
- **責任**: テスト実装、品質保証、パフォーマンス監視、セキュリティ

### 5. DevOps & Deployment Agent (`devops-deployment-agent.md`)

- **役割**: デプロイメントとインフラ管理
- **技術**: Vercel, GitHub Actions, PlanetScale
- **責任**: デプロイ管理、環境管理、CI/CD、モニタリング

## 使用方法

各エージェントは特定の領域に特化しており、以下のように使い分けます：

```bash
# フロントエンドの新機能開発
# → Frontend UI Agent を参照

# APIエンドポイントの追加
# → Backend API Agent を参照

# データベース設計の変更
# → Database Migration Agent を参照

# テストの追加や品質改善
# → Testing & Quality Agent を参照

# デプロイや環境設定
# → DevOps & Deployment Agent を参照
```

## エージェント間の連携

各エージェントは独立していますが、以下のような連携が必要です：

1. **Frontend ↔ Backend**: API仕様の共有、型定義の同期
2. **Backend ↔ Database**: データモデルの整合性、クエリ最適化
3. **All → Testing**: 各機能のテスト実装
4. **All → DevOps**: デプロイメント要件の共有

## 今後の拡張予定

- **Integration Agent**: 外部サービス連携（LINE, 決済システム）
- **Analytics Agent**: 分析とレポーティング
- **Customer Support Agent**: カスタマーサポート機能
