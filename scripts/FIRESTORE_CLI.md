# Firestore CLI for Codex

Codexから直接Firestoreを操作するためのCLIツール。

## セットアップ

### 1. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認:

```env
FIREBASE_ADMIN_PROJECT_ID=beeart-ena
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. 接続テスト

```bash
npm run firestore:test
```

成功すると以下のように表示されます:
```
✅ Firebase Admin initialized for project: beeart-ena
🔥 Testing Firestore connection...
✅ Found 1 documents in users
  - users: OK
✅ Found 1 documents in service-plans
  - service-plans: OK
✅ Connection test complete
```

## 使用可能なコマンド

### 1. コレクションの一覧表示

```bash
# デフォルト（最大100件）
npm run firestore list <collection>

# 件数指定
npm run firestore list users 10
npm run firestore list service-plans 50
```

**例:**
```bash
npm run firestore list users 5
```

### 2. 特定のドキュメント取得

```bash
npm run firestore get <collection> <docId>
```

**例:**
```bash
npm run firestore get users YZcxjpAAyFcH6TddLsqbi3Myf1w1
npm run firestore get service-plans plan-2d
```

### 3. 接続テスト

```bash
npm run firestore:test
```

## プログラムから使用する

TypeScriptファイルから直接インポートして使用できます:

```typescript
import {
  listCollection,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  batchUpdate,
} from './scripts/firestore-cli'

// コレクション一覧
const users = await listCollection('users', 10)

// ドキュメント取得
const user = await getDocument('users', 'userId123')

// ドキュメント作成
const newUser = await createDocument('users', {
  email: 'test@example.com',
  name: 'テストユーザー',
  role: 'customer',
  points: 0,
})

// ドキュメント更新
await updateDocument('users', 'userId123', {
  points: 100,
  name: '更新されたユーザー',
})

// ドキュメント削除
await deleteDocument('users', 'userId123')

// クエリ
const adminUsers = await queryDocuments('users', [
  { field: 'role', operator: '==', value: 'admin' },
])

// バッチ更新
await batchUpdate([
  { collection: 'users', id: 'user1', data: { points: 50 } },
  { collection: 'users', id: 'user2', data: { points: 100 } },
])
```

## 主要なコレクション

### users
- ユーザー情報
- フィールド: email, name, phone, role, points, birthday, createdAt, updatedAt

### service-plans
- サービスプラン情報
- フィールド: name, description, type, price, duration, isPublished, etc.

### announcements
- お知らせ情報
- フィールド: title, content, category, startDate, endDate, isPublished, etc.

### reservations
- 予約情報
- フィールド: userId, serviceId, date, time, status, etc.

## 便利な使用例

### 管理者ユーザーを探す

```bash
# まずusersコレクションを確認
npm run firestore list users 100

# 出力結果から role: "admin" のユーザーを探す
```

### サービスプラン一覧を確認

```bash
npm run firestore list service-plans
```

### 特定のユーザーの予約を確認

スクリプトから:
```typescript
import { queryDocuments } from './scripts/firestore-cli'

const reservations = await queryDocuments('reservations', [
  { field: 'userId', operator: '==', value: 'YZcxjpAAyFcH6TddLsqbi3Myf1w1' },
])
```

## 注意事項

1. **本番環境への影響**: このツールは本番Firestoreに直接アクセスします。データの変更・削除には十分注意してください。

2. **認証情報の管理**: `FIREBASE_ADMIN_PRIVATE_KEY` は非常に機密性が高い情報です。絶対にGitHubにコミットしないでください。

3. **タイムスタンプ**: Firestoreのタイムスタンプは `{ _seconds, _nanoseconds }` 形式で返されます。

4. **バッチ操作**: 大量のデータを更新する場合は、バッチ操作を使用してください（最大500件まで）。

## トラブルシューティング

### 「Firebase Admin is not initialized」エラー

環境変数が正しく設定されていません:
```bash
# .env.localの内容を確認
cat .env.local | grep FIREBASE_ADMIN
```

### 「Permission denied」エラー

Firestore Rulesで権限が拒否されています。Firebase Admin SDKは管理者権限で動作するため、通常は発生しません。Firestore Rulesを確認してください。

### タイムアウトエラー

ネットワーク接続またはFirestoreの応答が遅い可能性があります。しばらく待ってから再試行してください。
