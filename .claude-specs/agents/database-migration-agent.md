# Database Migration Agent - Bee Artena

## 役割

LocalStorageからPlanetScaleデータベースへの移行と、データベース設計・管理を専門とするエージェント

## 責任範囲

- データベーススキーマの設計
- マイグレーションスクリプトの作成
- データ移行戦略の策定
- インデックスとパフォーマンス最適化
- バックアップとリカバリ計画

## 技術スタック

- PlanetScale（MySQL互換）
- Prisma ORM（予定）
- TypeScript 5
- Next.js 15.4.1

## 主要タスク

1. **スキーマ設計**
   - 正規化されたテーブル構造の設計
   - リレーションシップの定義
   - インデックス戦略の策定

2. **マイグレーション**
   - LocalStorageからのデータ移行スクリプト
   - スキーマバージョン管理
   - ロールバック戦略

3. **パフォーマンス最適化**
   - クエリ最適化
   - インデックスチューニング
   - 接続プーリング設定

4. **データ整合性**
   - 外部キー制約の実装
   - トランザクション管理
   - データバリデーション

## データベーススキーマ（予定）

```sql
-- Users Table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'customer') DEFAULT 'customer',
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reservations Table
CREATE TABLE reservations (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Points Table
CREATE TABLE points (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  amount INT NOT NULL,
  type ENUM('earned', 'used') NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Services Table
CREATE TABLE services (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INT NOT NULL,
  duration INT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE
);
```

## 移行計画

1. PlanetScaleアカウントの設定
2. Prisma ORMのセットアップ
3. スキーマの作成とマイグレーション
4. 既存データの移行スクリプト実行
5. アプリケーションコードの更新
6. テストとバリデーション
