# BEE ART ENA API最適化ガイド

## 概要

このドキュメントは、BEE ART ENAプロジェクトのバックエンドAPIの最適化実装について説明します。

## 主な最適化内容

### 1. APIルート構造の整理とRESTful設計

- **バージョニング**: `/api/v1/` プレフィックスを使用
- **統一されたレスポンス形式**: 成功/エラーの一貫した構造
- **ベースハンドラー**: `createApiHandler`を使用した標準化

```typescript
// 例: 新しいAPIエンドポイントの作成
export const { GET, POST } = createApiHandler(
  {
    GET: async (req) => {
      // ハンドラーロジック
      return apiSuccess(data);
    }
  },
  {
    auth: true,
    rateLimit: { limit: 100, window: 60 },
    validation: { query: schema }
  }
);
```

### 2. レート制限の実装

- **Redisベース**: 分散環境でも動作
- **フォールバック**: Redisが利用できない場合はメモリ内ストア
- **カスタマイズ可能**: エンドポイントごとに制限を設定

```typescript
// 使用例
rateLimit: { 
  limit: 100,  // 100リクエスト
  window: 60   // 60秒間
}
```

### 3. キャッシング戦略（Redis）

- **自動圧縮**: 大きなデータは自動的に圧縮
- **タグベース無効化**: 関連データの一括削除
- **デコレーター**: メソッドレベルでのキャッシング

```typescript
// 使用例
const cached = await cache.get('key');
await cache.set('key', data, 300, { tags: ['users'] });
await cache.invalidateByTag('users');
```

### 4. データベースクエリの最適化

- **リポジトリパターン**: 一貫したデータアクセス層
- **バッチ処理**: 複数のIDを効率的に取得
- **自動キャッシング**: よく使用されるクエリの結果をキャッシュ

```typescript
// 使用例
const user = await userRepository.findById('123');
const users = await userRepository.find({
  where: [{ field: 'role', operator: '==', value: 'customer' }],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20
});
```

### 5. 非同期処理とキューイング

- **優先度付きキュー**: 重要なジョブを優先的に処理
- **自動リトライ**: 失敗したジョブの再試行
- **遅延実行**: 指定時間後の実行

```typescript
// 使用例
await queue.add('send_email', {
  to: 'user@example.com',
  subject: '予約確認'
}, {
  priority: 10,
  delay: 5000 // 5秒後に実行
});
```

### 6. APIドキュメント（OpenAPI/Swagger）

- **自動生成**: TypeScriptの型から生成
- **インタラクティブUI**: `/api/v1/docs`でアクセス可能
- **テスト可能**: UIから直接APIをテスト

### 7. APIバージョニング

- **URL パス**: `/api/v1/`, `/api/v2/` など
- **後方互換性**: 古いバージョンのサポート
- **段階的移行**: 新機能は新バージョンで提供

### 8. Webhookシステム

- **イベント駆動**: 重要なイベントを外部システムに通知
- **署名検証**: セキュアな通信
- **自動リトライ**: 失敗時の再送信

```typescript
// 使用例
await webhookService.sendReservationCreated(reservation);
```

## 環境変数

```env
# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_QUEUE_DB=2

# Queue設定
QUEUE_CONCURRENCY=5

# API設定
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
JWT_SECRET=your_jwt_secret
```

## 使用方法

### 新しいAPIエンドポイントの作成

1. `/app/api/v1/[resource]/route.ts` にファイルを作成
2. `createApiHandler` を使用してハンドラーを定義
3. バリデーションスキーマを定義
4. 必要に応じてキャッシングとレート制限を設定

### リポジトリの作成

1. `/lib/api/repository/[name]Repository.ts` にファイルを作成
2. `BaseRepository` を継承
3. カスタムメソッドを実装

### Webhookイベントの追加

1. `WebhookEvents` に新しいイベントタイプを追加
2. `webhookService` にヘルパーメソッドを追加
3. 適切な場所でイベントを発火

## パフォーマンスのベストプラクティス

1. **キャッシュファースト**: 可能な限りキャッシュを使用
2. **バッチ処理**: 複数の操作をまとめて実行
3. **非同期処理**: 重い処理はキューに入れる
4. **インデックス**: よく検索されるフィールドにインデックスを作成
5. **ページネーション**: 大量のデータは必ずページ分割

## セキュリティ考慮事項

1. **認証**: すべてのAPIエンドポイントで認証を要求
2. **認可**: ユーザーの権限を適切にチェック
3. **バリデーション**: 入力データを必ず検証
4. **レート制限**: DDoS攻撃を防ぐ
5. **HTTPS**: 本番環境では必ずHTTPSを使用

## モニタリング

1. **ログ**: `logger` を使用して適切にログを記録
2. **メトリクス**: レスポンスタイム、エラー率を監視
3. **アラート**: 重要なエラーは即座に通知
4. **ダッシュボード**: 全体的な健全性を可視化