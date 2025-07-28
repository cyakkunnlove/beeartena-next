# Firebase手動セットアップガイド

Firebaseの初期データを手動で設定するための手順です。

## 1. 権限の設定

1. [Google Cloud Console](https://console.developers.google.com/iam-admin/iam/project?project=beeart-ena) にアクセス
2. サービスアカウント `firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com` を探す
3. 以下のロールを追加：
   - `Service Usage Consumer` (serviceusage.serviceUsageConsumer)
   - `Firebase Admin SDK Administrator Service Agent`
   - `Cloud Datastore User`

## 2. Firebase Authenticationの設定

1. [Firebase Console](https://console.firebase.google.com/project/beeart-ena/authentication/users) にアクセス
2. 「ユーザーを追加」をクリック
3. 以下のユーザーを作成：

### 管理者ユーザー
- Email: `admin@beeartena.com`
- Password: `BeeArtEna2024Admin!`

### テストユーザー（開発環境用）
- Email: `test@example.com`
- Password: `testpass123`

## 3. Firestoreデータの初期化

[Firestore Console](https://console.firebase.google.com/project/beeart-ena/firestore) で以下のコレクションとドキュメントを作成：

### users コレクション

管理者ユーザー（ドキュメントID: 作成したユーザーのUID）
```json
{
  "id": "[管理者のUID]",
  "email": "admin@beeartena.com",
  "name": "管理者",
  "phone": "0000-00-0000",
  "role": "admin",
  "points": 0,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

### settings コレクション

#### reservation ドキュメント
```json
{
  "businessHours": [
    { "dayOfWeek": 0, "open": "10:00", "close": "18:00", "isOpen": false },
    { "dayOfWeek": 1, "open": "10:00", "close": "18:00", "isOpen": true },
    { "dayOfWeek": 2, "open": "10:00", "close": "18:00", "isOpen": true },
    { "dayOfWeek": 3, "open": "10:00", "close": "18:00", "isOpen": true },
    { "dayOfWeek": 4, "open": "10:00", "close": "18:00", "isOpen": true },
    { "dayOfWeek": 5, "open": "10:00", "close": "18:00", "isOpen": true },
    { "dayOfWeek": 6, "open": "10:00", "close": "18:00", "isOpen": false }
  ],
  "slotDuration": 60,
  "maxCapacityPerSlot": 1,
  "blockedDates": [],
  "updatedAt": [現在時刻]
}
```

#### points ドキュメント
```json
{
  "earnRate": 0.05,
  "birthdayBonus": 1000,
  "expirationDays": 365,
  "updatedAt": [現在時刻]
}
```

### services コレクション

#### 2d-eyebrow ドキュメント
```json
{
  "id": "2d-eyebrow",
  "category": "2D",
  "name": "2D眉毛",
  "description": "自然で美しい眉毛を演出",
  "price": 30000,
  "duration": 60,
  "isActive": true,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

#### 3d-eyebrow ドキュメント
```json
{
  "id": "3d-eyebrow",
  "category": "3D",
  "name": "3D眉毛",
  "description": "立体的でリアルな眉毛",
  "price": 50000,
  "duration": 90,
  "isActive": true,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

#### 4d-eyebrow ドキュメント
```json
{
  "id": "4d-eyebrow",
  "category": "4D",
  "name": "4D眉毛",
  "description": "最新技術による極めて自然な眉毛",
  "price": 70000,
  "duration": 120,
  "isActive": true,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

#### 2d-lips ドキュメント
```json
{
  "id": "2d-lips",
  "category": "2D",
  "name": "2Dリップ",
  "description": "美しい唇の色と形",
  "price": 40000,
  "duration": 60,
  "isActive": true,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

#### 3d-lips ドキュメント
```json
{
  "id": "3d-lips",
  "category": "3D",
  "name": "3Dリップ",
  "description": "立体的で魅力的な唇",
  "price": 60000,
  "duration": 90,
  "isActive": true,
  "createdAt": [現在時刻],
  "updatedAt": [現在時刻]
}
```

## 4. セキュリティルールの設定

初期化が完了したら、[Firestore Rules](https://console.firebase.google.com/project/beeart-ena/firestore/rules) で本番用のセキュリティルールを設定してください。

ルールファイル: `/firebase-rules/firestore.rules`

## 5. 確認

1. 作成したユーザーでログインできることを確認
2. Firestoreのデータが正しく表示されることを確認
3. アプリケーションが正常に動作することを確認