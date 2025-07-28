# Firebase データベース移行ガイド

## 概要

このガイドでは、現在のモック実装から本番のFirebaseへ移行する手順を詳しく説明します。現在のシステムは、開発環境でlocalStorageを使用し、本番環境でFirestoreを使用する設計になっています。

## 前提条件

- Firebaseアカウントの作成
- Node.js 18以上
- npmまたはyarnのインストール
- Gitの基本的な知識

## 移行手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例：`beeartena-production`）
4. Google Analyticsの設定（任意）
5. プロジェクトの作成完了を待つ

### 2. Firebase設定の取得

1. プロジェクトの設定画面に移動
2. 「全般」タブで「アプリを追加」をクリック
3. ウェブアプリ（</>）を選択
4. アプリ名を入力（例：`BEE ART ENA Web`）
5. Firebase SDKの設定をコピー

```javascript
// 以下のような設定が表示されます
const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-auth-domain',
  projectId: 'your-project-id',
  storageBucket: 'your-storage-bucket',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
}
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、Firebase設定を追加：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Enable Firebase (本番環境で使用)
NEXT_PUBLIC_USE_FIREBASE=true
```

### 4. Firebase Authenticationの設定

1. Firebase Consoleで「Authentication」を選択
2. 「始める」をクリック
3. 「メール/パスワード」を有効化
4. 「保存」をクリック

### 5. Firestoreの設定

1. Firebase Consoleで「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールの選択：
   - 開発中：「テストモードで開始」
   - 本番：「本番モードで開始」（後でルールを設定）
4. ロケーションを選択（asia-northeast1推奨）

### 6. セキュリティルールの設定

Firestoreのセキュリティルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー情報
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if false;
    }

    // 予約情報
    match /reservations/{reservationId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.customerId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.customerId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // ポイント履歴
    match /pointTransactions/{transactionId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow update: if false;
      allow delete: if false;
    }

    // 設定情報（管理者のみ）
    match /settings/{document} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 7. Cloud Storageの設定（画像アップロード用）

1. Firebase Consoleで「Storage」を選択
2. 「始める」をクリック
3. セキュリティルールを確認
4. ロケーションを選択

Storageのセキュリティルール：

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // プロフィール画像
    match /users/{userId}/profile/{filename} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // 施術画像（管理者のみ）
    match /treatments/{filename} {
      allow read: if true;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 8. 初期データの投入

Firebase Admin SDKを使用して初期データを投入します。

`scripts/initialize-firebase.js`を作成：

```javascript
const admin = require('firebase-admin')
const serviceAccount = require('./path-to-service-account-key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function initializeDatabase() {
  // 管理者ユーザーの作成
  const adminUser = await admin.auth().createUser({
    email: 'admin@beeartena.com',
    password: 'your-secure-password',
    displayName: '管理者',
  })

  // 管理者権限の設定
  await db.collection('users').doc(adminUser.uid).set({
    id: adminUser.uid,
    email: adminUser.email,
    name: '管理者',
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // 予約設定の初期化
  await db
    .collection('settings')
    .doc('reservation')
    .set({
      businessHours: [
        { dayOfWeek: 0, open: '10:00', close: '18:00', isOpen: false },
        { dayOfWeek: 1, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 2, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 4, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 5, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 6, open: '10:00', close: '18:00', isOpen: false },
      ],
      slotDuration: 60,
      maxCapacityPerSlot: 1,
      blockedDates: [],
    })

  console.log('初期データの投入が完了しました')
}

initializeDatabase().catch(console.error)
```

### 9. コードの修正

#### 9.1 Firebase設定の有効化

`lib/firebase/config.ts`を確認し、環境変数が正しく読み込まれることを確認：

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}
```

#### 9.2 サービス層の切り替え

各サービスファイルで、環境変数に基づいて実装を切り替える：

```typescript
// 例：lib/services/userService.ts
import { userService as firebaseUserService } from '@/lib/firebase/users'
import { mockUserService } from '@/lib/mock/mockFirebase'

const isFirebaseEnabled = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true'

export const userService = isFirebaseEnabled
  ? firebaseUserService
  : mockUserService
```

### 10. データ移行スクリプト

既存のlocalStorageデータをFirestoreに移行するスクリプト：

`scripts/migrate-to-firebase.js`:

```javascript
// ブラウザのコンソールで実行
async function migrateToFirebase() {
  // localStorageからデータを取得
  const users = JSON.parse(localStorage.getItem('users') || '[]')
  const reservations = JSON.parse(localStorage.getItem('reservations') || '[]')
  const points = JSON.parse(localStorage.getItem('points') || '[]')

  // Firebaseに接続（事前に認証が必要）
  const { auth, firestore } = window.firebase

  // データの移行
  for (const user of users) {
    await firestore
      .collection('users')
      .doc(user.id)
      .set({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      })
  }

  for (const reservation of reservations) {
    await firestore
      .collection('reservations')
      .doc(reservation.id)
      .set({
        ...reservation,
        createdAt: new Date(reservation.createdAt),
        updatedAt: new Date(reservation.updatedAt),
      })
  }

  for (const point of points) {
    await firestore
      .collection('pointTransactions')
      .doc(point.id)
      .set({
        ...point,
        createdAt: new Date(point.createdAt),
      })
  }

  console.log('データ移行が完了しました')
}
```

### 11. 本番環境へのデプロイ

1. Vercelの環境変数を設定
2. Firebase設定を本番用に更新
3. セキュリティルールを本番モードに変更
4. デプロイを実行

```bash
# 本番環境へのデプロイ
git add .
git commit -m "Enable Firebase for production"
git push origin main
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 認証エラー

- Firebase設定が正しいか確認
- APIキーの有効化を確認
- ドメインの許可リストを確認

#### 2. Firestoreアクセスエラー

- セキュリティルールを確認
- インデックスの作成が必要な場合がある
- クォータ制限を確認

#### 3. パフォーマンス問題

- 複合インデックスの作成
- データの非正規化を検討
- キャッシュ戦略の見直し

## ベストプラクティス

1. **段階的移行**
   - まず開発環境で完全にテスト
   - 一部の機能から順次移行
   - ロールバック計画を準備

2. **セキュリティ**
   - 最小権限の原則を適用
   - 定期的なセキュリティルールの見直し
   - 監査ログの有効化

3. **パフォーマンス**
   - 適切なインデックスの作成
   - バッチ処理の活用
   - オフラインサポートの実装

4. **コスト管理**
   - 使用量のモニタリング
   - 予算アラートの設定
   - 不要なデータの定期削除

## 次のステップ

1. バックアップ戦略の実装
2. 監視・アラートの設定
3. CI/CDパイプラインの構築
4. A/Bテストの実施

## 参考リンク

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js with Firebase](https://nextjs.org/docs/authentication)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
