# BEE ART ENA テストスイート

このプロジェクトは包括的なテストスイートを備えており、80%以上のコードカバレッジを目標としています。

## クイックスタート

```bash
# 依存関係のインストール
npm install

# すべてのテストを実行
npm test

# カバレッジレポート付きでテストを実行
npm run test:coverage

# E2Eテストを実行
npm run test:e2e
```

## テストコマンド一覧

```bash
# ユニットテスト
npm test                    # すべてのテストを実行
npm run test:watch         # ウォッチモードで実行
npm run test:coverage      # カバレッジレポート生成
npm run test:unit          # ユニットテストのみ実行
npm run test:integration   # 統合テストのみ実行

# E2Eテスト
npm run test:e2e           # E2Eテストを実行
npm run test:e2e:ui        # UIモードで実行（デバッグ用）
npm run test:e2e:debug     # デバッグモードで実行

# パフォーマンステスト
npm run test:perf          # パフォーマンステストを実行

# アクセシビリティテスト
npm run test:a11y          # アクセシビリティテストを実行
```

## テストファイル構成

```
beeartena-next/
├── __tests__/
│   ├── unit/                # ユニットテスト
│   │   ├── components/      # コンポーネントテスト
│   │   └── lib/            # ビジネスロジックテスト
│   ├── integration/         # 統合テスト
│   │   └── api/            # APIエンドポイントテスト
│   └── accessibility/       # アクセシビリティテスト
├── e2e/                     # E2Eテスト
│   ├── auth.spec.ts        # 認証フロー
│   ├── reservation.spec.ts  # 予約フロー
│   ├── mobile.spec.ts      # モバイル体験
│   └── visual-regression.spec.ts # ビジュアルテスト
├── k6/                      # パフォーマンステスト
│   ├── performance.js      # 基本的なパフォーマンステスト
│   └── load-test.js        # 負荷テスト
└── test/                    # テストユーティリティ
    ├── utils/              # テストヘルパー
    ├── mocks/              # モックデータとハンドラー
    └── setup.ts            # テストセットアップ
```

## カバレッジレポート

テスト実行後、カバレッジレポートは以下の場所に生成されます：

- HTML形式: `coverage/lcov-report/index.html`
- ターミナル: テスト実行時に表示

## CI/CD統合

プッシュ時に自動的に以下のテストが実行されます：

1. Lint チェック
2. TypeScript型チェック
3. ユニット・統合テスト
4. E2Eテスト
5. アクセシビリティテスト
6. セキュリティスキャン
7. ビルドチェック

## ローカル開発でのテスト

### VSCode統合

`.vscode/settings.json`に以下を追加することで、VSCode内でテストを実行できます：

```json
{
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": {
    "watch": false,
    "onSave": "test-file"
  }
}
```

### pre-commitフック

コミット前に自動的にテストを実行するには：

```bash
npx husky add .husky/pre-commit "npm test"
```

## トラブルシューティング

### テストが失敗する場合

1. Node.jsバージョンを確認（18以上が必要）
2. `node_modules`を削除して再インストール
3. キャッシュをクリア: `npm test -- --clearCache`

### E2Eテストのデバッグ

```bash
# ブラウザを表示してテスト
npx playwright test --headed

# 特定のテストのみ実行
npx playwright test auth.spec.ts

# トレースビューアーを使用
npx playwright show-trace trace.zip
```

### パフォーマンステストの調整

`k6/performance.js`の`options`セクションで負荷を調整できます：

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // ユーザー数を調整
    { duration: '1m', target: 50 },
  ],
}
```

## ベストプラクティス

1. **新機能追加時**: 必ず対応するテストを書く
2. **バグ修正時**: まずテストを書いてバグを再現、その後修正
3. **リファクタリング時**: テストが通ることを確認しながら進める
4. **コードレビュー時**: テストカバレッジを確認

## 詳細なドキュメント

より詳細な情報は[TEST_GUIDE.md](/Users/takuyakatou/Library/CloudStorage/OneDrive-個人用/デスクトップ/beeartena-next/TEST_GUIDE.md)を参照してください。
