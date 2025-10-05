# Firestore 初期データ投入ガイド

このドキュメントでは、Firestore にサービスプランとお知らせの初期データを投入する方法を説明します。

## 前提条件

Firebase Admin SDK の環境変数が設定されている必要があります:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

または、`NEXT_PUBLIC_FIREBASE_PROJECT_ID` のみでも実行可能です（デフォルト認証を使用）。

## 初期データ投入

### 1. サービスプランの投入

以下のコマンドでサービスプラン（2D, 3D, 4D）を Firestore に投入します:

```bash
npm run firebase:seed:plans
```

投入されるデータ:
- `plan-2d`: 2Dまつ毛エクステ (8,000円/モニター価格 6,000円)
- `plan-3d`: 3Dまつ毛エクステ (10,000円/モニター価格 8,000円)
- `plan-4d`: 4Dまつ毛エクステ (12,000円/モニター価格 10,000円)

### 2. お知らせの投入

以下のコマンドでサンプルのお知らせを Firestore に投入します:

```bash
npm run firebase:seed:announcements
```

投入されるデータ:
- サービス開始のお知らせ（ピン留め）
- 新規会員様限定キャンペーン

### 3. 全データの一括投入

```bash
npm run firebase:seed:all
```

## データの確認

Firestore コンソールで以下のコレクションを確認してください:

- `service-plans`: サービスプラン一覧
- `announcements`: お知らせ一覧

## カスタマイズ

### サービスプランのカスタマイズ

`lib/firebase/servicePlans.ts` の `defaultServicePlans` 配列を編集してください:

```typescript
export const defaultServicePlans = [
  {
    id: 'plan-custom',
    type: '2D',
    name: 'カスタムプラン',
    description: '説明',
    price: 5000,
    monitorPrice: 4000,
    duration: 60,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 4,
  },
  // ... 他のプラン
]
```

### お知らせのカスタマイズ

`scripts/seed-announcements.ts` の `sampleAnnouncements` 配列を編集してください:

```typescript
const sampleAnnouncements = [
  {
    id: 'announcement-custom',
    title: 'カスタムお知らせ',
    body: '本文',
    publishAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isPinned: false,
    priority: 50,
  },
]
```

## 注意事項

- スクリプトは既存のデータをスキップします（上書きしません）
- 日付は UTC ISO 形式で保存されます
- `isPublished: false` のサービスプランは公開ページに表示されません
- `expiresAt` を過ぎたお知らせは自動的に非表示になります

## トラブルシューティング

### エラー: "FIREBASE_ADMIN_PROJECT_ID is required"

環境変数が設定されていません。`.env.local` または `.env.production` に以下を追加してください:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
```

### エラー: "Permission denied"

Firebase Admin SDK のサービスアカウントに適切な権限がない可能性があります。
Firebase コンソールでサービスアカウントの権限を確認してください。

### データが投入されない

1. Firebase プロジェクト ID が正しいか確認
2. Firestore が有効化されているか確認
3. ネットワーク接続を確認
