# Cloud Functions for Customer Deletion

このディレクトリには、顧客削除時の関連データ処理を行うCloud Functionsが含まれています。

## 機能

### 1. onUserDeleted
- ユーザーが論理削除（deleted=true）されたときにトリガー
- 関連データの論理削除と匿名化を実行：
  - 予約データ：個人情報を匿名化
  - ポイント履歴：論理削除
  - お問い合わせ履歴：個人情報を匿名化

### 2. cleanupDeletedData
- 毎日午前3時に実行されるスケジュール関数
- 30日以上前に削除されたデータを物理削除
- GDPR等のコンプライアンス対応

### 3. forceDeleteUser
- 管理者による即時物理削除（callable function）
- 全ての関連データを即座に削除
- Firebase Authenticationからも削除

## セットアップ

```bash
# 依存関係のインストール
cd functions
npm install

# ローカルでのテスト
npm run serve

# デプロイ
npm run deploy
```

## デプロイ前の準備

1. Firebase CLIをインストール
```bash
npm install -g firebase-tools
```

2. Firebaseにログイン
```bash
firebase login
```

3. プロジェクトを選択
```bash
firebase use beeart-ena
```

## 本番デプロイ

```bash
# Cloud Functionsのみデプロイ
firebase deploy --only functions

# 特定の関数のみデプロイ
firebase deploy --only functions:onUserDeleted
```

## 注意事項

- Cloud Functionsの使用にはBlazeプラン（従量課金）が必要です
- 関数の実行には料金が発生する可能性があります
- 物理削除は復元不可能なので、慎重に運用してください

## データ保持ポリシー

- 論理削除後30日間はデータを保持
- 30日経過後に自動的に物理削除
- 法的要件がある場合は保持期間を調整可能