# BEE ART ENA プロジェクトドキュメント

## 概要

BEE ART ENAは、岐阜県恵那市で営業するタトゥーメイクサロンのWebアプリケーションです。予約管理、顧客管理、ポイントシステムなどの機能を提供し、サロンの業務効率化と顧客満足度向上を目指しています。

## 技術スタック

### フロントエンド
- **Next.js 15.4.1** - React フレームワーク
- **TypeScript** - 型安全性の確保
- **Tailwind CSS** - ユーティリティファーストCSS
- **Framer Motion** - アニメーション
- **Recharts** - データ可視化

### 認証・データ管理
- **Firebase** (準備済み、現在はモック使用)
  - Authentication - ユーザー認証
  - Firestore - データベース
  - Storage - 画像保存
- **ローカルストレージ** - 開発環境でのデータ永続化

### デプロイメント
- **Vercel** - ホスティング・自動デプロイ
- **GitHub** - バージョン管理

## アーキテクチャ

### ディレクトリ構造

```
beeartena-next/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理者画面
│   ├── api/               # APIルート
│   ├── mypage/            # マイページ
│   └── (public pages)     # 公開ページ
├── components/            # 再利用可能なコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── reservation/      # 予約関連
│   └── ui/              # UIコンポーネント
├── lib/                   # ビジネスロジック
│   ├── auth/            # 認証関連
│   ├── firebase/        # Firebase設定
│   ├── mock/            # モックデータ
│   └── services/        # サービス層
├── public/               # 静的ファイル
└── docs/                # ドキュメント
```

### データモデル

#### User（ユーザー）
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  points?: number;
  birthday?: string; // YYYY-MM-DD format
  lastBirthdayPointsYear?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Reservation（予約）
```typescript
interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: '2D' | '3D' | '4D';
  serviceName: string;
  price: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### PointTransaction（ポイント取引）
```typescript
interface PointTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'used' | 'manual' | 'expired' | 'adjusted' | 'redeemed';
  amount: number;
  balance?: number;
  description?: string;
  reason?: string;
  referenceId?: string;
  createdAt: string | Date;
}
```

## 主要機能

### 1. ユーザー認証
- 会員登録（メール・パスワード）
- ログイン/ログアウト
- パスワードリセット（準備中）
- ロールベースアクセス制御（customer/admin）

### 2. 予約システム
- サービス選択（2D/3D/4Dタトゥーメイク）
- 日時選択（営業時間・休業日考慮）
- オンライン予約
- 予約履歴管理
- ステータス管理（承認待ち→確定→完了）

### 3. ポイントシステム
- 利用額の5%ポイント還元
- 誕生日に1,000ポイント付与
- ポイント履歴管理
- 予約時のポイント利用

### 4. 管理者機能
- ダッシュボード（売上・予約統計）
- 顧客管理（情報編集・ティア管理）
- 予約管理（承認・キャンセル）
- ポイント管理（手動付与・調整）
- 誕生日管理（一括処理）
- 売上分析（グラフ表示）
- 営業設定（営業時間・休業日）

### 5. 休業日設定
- 定休日の一括設定
- 期間指定での休業日設定
- 特定月への定休日適用
- カレンダー表示
- 個別休業日管理

## セキュリティ

### 実装済み
- JWTトークンによる認証
- ロールベースアクセス制御
- APIレート制限
- 入力値バリデーション
- XSS対策（React標準）
- 環境変数による機密情報管理

### 今後の実装予定
- CSRF対策
- セキュリティヘッダー設定
- データ暗号化
- 監査ログ

## パフォーマンス最適化

### 実装済み
- 画像最適化（Next.js Image）
- コード分割（動的インポート）
- キャッシュ戦略
- レスポンシブ画像
- Lazy Loading

### 今後の最適化
- データベースインデックス
- CDN活用
- Service Worker
- 静的生成の活用

## アクセシビリティ

### 実装済み
- セマンティックHTML
- ARIA属性
- キーボードナビゲーション
- スクリーンリーダー対応
- カラーコントラスト
- フォーカス管理

## 開発環境セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/cyakkunnlove/beeartena-next.git

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localファイルを編集

# 開発サーバーの起動
npm run dev
```

## ビルド・デプロイ

```bash
# ビルド
npm run build

# ローカルでの本番環境テスト
npm start

# Vercelへのデプロイ（自動）
git push origin main
```

## テスト

現在、テストフレームワークは未実装です。今後以下を追加予定：
- Jest - ユニットテスト
- React Testing Library - コンポーネントテスト
- Cypress - E2Eテスト

## 今後の課題

### 技術的改善
1. TypeScriptの型定義強化
2. エラーハンドリングの統一
3. ログシステムの実装
4. テストカバレッジの向上
5. パフォーマンスモニタリング

### 機能追加
1. プッシュ通知
2. メール通知
3. LINE連携
4. 決済システム統合
5. 多言語対応

### インフラ改善
1. CI/CDパイプラインの強化
2. ステージング環境の構築
3. バックアップ戦略
4. 監視・アラート設定

## ライセンス

プロプライエタリ - BEE ART ENA専用

## 連絡先

質問や提案がある場合は、プロジェクトオーナーまでご連絡ください。