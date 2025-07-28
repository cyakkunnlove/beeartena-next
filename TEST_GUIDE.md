# BEE ART ENA テストガイド

## 概要

このドキュメントは、BEE ART ENAプロジェクトの包括的なテストスイートの使用方法を説明します。

## テストカバレッジ目標

- **全体**: 80%以上
- **ブランチ**: 80%以上
- **関数**: 80%以上
- **行**: 80%以上

## テストの種類

### 1. ユニットテスト

個々の関数やコンポーネントの動作を検証します。

```bash
# すべてのユニットテストを実行
npm test

# 特定のファイルのテストを実行
npm test -- reservationService.test.ts

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

#### 主要なユニットテスト

- **ビジネスロジック**: `__tests__/unit/lib/`
  - 予約サービス
  - JWT認証
  - データ検証

- **コンポーネント**: `__tests__/unit/components/`
  - UIコンポーネント
  - フォーム要素
  - レイアウトコンポーネント

### 2. 統合テスト

APIエンドポイントやサービス間の連携を検証します。

```bash
# 統合テストを実行
npm run test:integration
```

#### 主要な統合テスト

- **認証フロー**: ログイン、ログアウト、トークン検証
- **予約API**: 予約作成、取得、更新、削除
- **顧客管理**: 顧客情報のCRUD操作

### 3. E2Eテスト

実際のユーザーシナリオを通じてアプリケーション全体をテストします。

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグ用）
npm run test:e2e:ui

# 特定のブラウザでテスト
npx playwright test --project=chromium
```

#### 主要なE2Eテスト

- **認証フロー**: ユーザー登録、ログイン、ログアウト
- **予約フロー**: サービス選択から予約完了まで
- **モバイル体験**: レスポンシブデザイン、タッチ操作

### 4. パフォーマンステスト

アプリケーションの負荷耐性と応答時間を検証します。

```bash
# パフォーマンステストを実行
npm run test:perf

# カスタムシナリオを実行
k6 run k6/load-test.js
```

#### テストシナリオ

- **通常負荷**: 50ユーザーで5分間
- **スパイクテスト**: 100→200→100ユーザー
- **ストレステスト**: 特定エンドポイントへの集中アクセス

### 5. アクセシビリティテスト

WCAG 2.1準拠を確認します。

```bash
# アクセシビリティテストを実行
npm run test:a11y
```

#### チェック項目

- 色のコントラスト
- キーボードナビゲーション
- スクリーンリーダー対応
- ARIA属性の適切な使用

## テスト環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.test`ファイルを作成：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=test-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=test-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=test-app-id
JWT_SECRET=test-jwt-secret
```

### 3. Playwrightのインストール

```bash
npx playwright install
```

## テストの書き方

### ユニットテストの例

```typescript
import { render, fireEvent } from '@/test/utils/render'
import Button from '@/components/ui/Button'

describe('Button', () => {
  it('should handle click events', () => {
    const handleClick = jest.fn()
    const { getByRole } = render(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    fireEvent.click(getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### E2Eテストの例

```typescript
import { test, expect } from '@playwright/test'

test('should complete reservation', async ({ page }) => {
  await page.goto('/reservation')
  await page.click('text=カット')
  await page.click('button:has-text("次へ")')
  // ... 続きのステップ
})
```

## CI/CD統合

### GitHub Actions設定

`.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

## トラブルシューティング

### テストが失敗する場合

1. **依存関係の確認**: `npm install`を再実行
2. **キャッシュのクリア**: `npm test -- --clearCache`
3. **環境変数**: `.env.test`ファイルの確認

### E2Eテストのデバッグ

```bash
# ヘッドレスモードを無効化
npx playwright test --headed

# デバッグモード
npx playwright test --debug
```

### カバレッジが低い場合

1. `coverage/lcov-report/index.html`を開いてカバレッジレポートを確認
2. カバーされていない行を特定
3. 該当箇所のテストを追加

## ベストプラクティス

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **明確な名前**: テストの目的が分かる名前を付ける
3. **AAA パターン**: Arrange, Act, Assert
4. **モックの使用**: 外部依存を適切にモック
5. **データファクトリ**: テストデータ生成にファクトリを使用

## 継続的な改善

- 定期的にカバレッジレポートを確認
- 失敗したテストの原因を分析
- パフォーマンステストの結果をモニタリング
- アクセシビリティ違反を継続的に修正