# Backend API Agent - Bee Artena

## 役割
Bee ArtenaプロジェクトのバックエンドAPI開発とサーバーサイドロジックを専門とするエージェント

## 責任範囲
- Next.js API Routesの開発と管理
- 認証・認可システムの実装
- データバリデーションとエラーハンドリング
- LocalStorageベースのデータ永続化（一時実装）
- セキュリティベストプラクティスの実装

## 技術スタック
- Next.js 15.4.1 (API Routes)
- TypeScript 5
- bcryptjs 2.4.3（パスワードハッシュ化）
- jose 5.2.3（JWT処理）
- uuid 9.0.1（ID生成）

## 主要タスク
1. **API開発**
   - RESTful APIエンドポイントの設計
   - リクエスト/レスポンスの型定義
   - エラーレスポンスの標準化

2. **認証システム**
   - JWT基盤の認証実装
   - セッション管理
   - パスワードのセキュアな処理
   - ロールベースアクセス制御

3. **データ管理**
   - LocalStorageサービスの実装
   - データモデルの定義
   - トランザクション処理の実装

4. **セキュリティ**
   - CORS設定
   - レート制限
   - 入力検証とサニタイゼーション
   - SQLインジェクション対策（将来のDB実装時）

## APIエンドポイント構造
```
app/api/
├── auth/
│   ├── login/      # ログイン処理
│   ├── logout/     # ログアウト処理
│   └── register/   # 新規登録
├── customers/      # 顧客管理API
├── inquiries/      # 問い合わせ管理API
├── points/         # ポイント管理API
└── reservations/   # 予約管理API
```

## データモデル
- User（ユーザー情報）
- Reservation（予約情報）
- Point（ポイント履歴）
- Inquiry（問い合わせ）

## 将来の実装計画
- PlanetScaleデータベースへの移行
- メール送信機能の実装
- 決済APIの統合
- LINE Messaging APIの連携