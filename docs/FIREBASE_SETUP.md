# Firebase セットアップガイド

## 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名: `beeartena-prod` (または任意の名前)

## 2. Firebase サービスの有効化

### Authentication
1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. Sign-in methodで「メール/パスワード」を有効化

### Firestore Database
1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 「本番環境」モードで開始（後でルールを設定）
4. ロケーション: asia-northeast1 (東京)

### Storage
1. 左メニューから「Storage」を選択
2. 「始める」をクリック
3. セキュリティルールはデフォルトで開始

## 3. 必要なコレクション

Firestoreで以下のコレクションを作成：

### users
```
- id: string (ドキュメントID)
- email: string
- name: string
- phone: string
- role: 'customer' | 'admin'
- points: number
- totalSpent: number
- birthday?: string (YYYY-MM-DD)
- lastBirthdayPointsYear?: number
- createdAt: timestamp
- updatedAt: timestamp
```

### reservations
```
- id: string (ドキュメントID)
- customerId: string (users.id への参照)
- customerName: string
- customerEmail: string
- customerPhone: string
- serviceType: '2D' | '3D' | '4D'
- serviceName: string
- price: number
- date: string (YYYY-MM-DD)
- time: string (HH:MM)
- status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
- notes?: string
- cancelReason?: string
- createdAt: timestamp
- updatedAt: timestamp
```

### points
```
- id: string (ドキュメントID)
- userId: string (users.id への参照)
- amount: number (正: 付与, 負: 使用)
- type: 'earned' | 'redeemed' | 'expired'
- reason: string
- createdAt: timestamp
```

### inquiries
```
- id: string (ドキュメントID)
- name: string
- email: string
- phone: string
- message: string
- status: 'unread' | 'read'
- createdAt: timestamp
- updatedAt: timestamp
```

### settings
```
- id: 'reservation_settings' (固定)
- slotDuration: number
- maxCapacityPerSlot: number
- businessHours: array
- blockedDates: array
```

## 4. セキュリティルール

Firestore Rules タブで以下のルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Reservations collection
    match /reservations/{reservationId} {
      allow read: if isAuthenticated() && 
        (resource.data.customerId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.customerId == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Points collection
    match /points/{pointId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAdmin();
      allow update: if false; // ポイントは編集不可
      allow delete: if false; // ポイントは削除不可
    }
    
    // Inquiries collection
    match /inquiries/{inquiryId} {
      allow read: if isAdmin();
      allow create: if true; // 誰でも問い合わせ可能
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Settings collection
    match /settings/{settingId} {
      allow read: if true; // 誰でも設定を読み取り可能
      allow write: if isAdmin();
    }
  }
}
```

## 5. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定：

```bash
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Firebase Console > プロジェクトの設定 > 全般 > マイアプリ > Firebase SDK snippet から値を取得

## 6. 初期データの作成

### 管理者ユーザーの作成
1. Firebase Console > Authentication > ユーザータブ
2. 「ユーザーを追加」をクリック
3. メールアドレス: admin@beeartena.jp
4. パスワード: 任意の安全なパスワード

### Firestoreで管理者データを作成
1. Firestore > users コレクション
2. ドキュメントID: 上記で作成したユーザーのUID
3. フィールド:
```json
{
  "email": "admin@beeartena.jp",
  "name": "管理者",
  "phone": "090-5278-5221",
  "role": "admin",
  "points": 0,
  "totalSpent": 0,
  "createdAt": サーバータイムスタンプ,
  "updatedAt": サーバータイムスタンプ
}
```

### 予約設定の初期化
1. Firestore > settings コレクション
2. ドキュメントID: `reservation_settings`
3. フィールド:
```json
{
  "slotDuration": 120,
  "maxCapacityPerSlot": 1,
  "businessHours": [
    {"dayOfWeek": 0, "open": "", "close": "", "isOpen": false},
    {"dayOfWeek": 1, "open": "18:30", "close": "20:30", "isOpen": true},
    {"dayOfWeek": 2, "open": "18:30", "close": "20:30", "isOpen": true},
    {"dayOfWeek": 3, "open": "09:00", "close": "17:00", "isOpen": true},
    {"dayOfWeek": 4, "open": "18:30", "close": "20:30", "isOpen": true},
    {"dayOfWeek": 5, "open": "18:30", "close": "20:30", "isOpen": true},
    {"dayOfWeek": 6, "open": "18:30", "close": "20:30", "isOpen": true}
  ],
  "blockedDates": []
}
```

## 7. 動作確認

1. アプリケーションを起動
2. 管理者アカウントでログイン
3. 各機能が正常に動作することを確認
   - 予約の作成
   - ポイントの付与
   - 設定の変更

## トラブルシューティング

### エラー: Permission denied
- セキュリティルールを確認
- ユーザーの認証状態を確認
- ユーザーのroleフィールドを確認

### エラー: Collection not found
- Firestoreで必要なコレクションが作成されているか確認
- コレクション名のスペルミスがないか確認

### エラー: Firebase app not initialized
- 環境変数が正しく設定されているか確認
- .env.localファイルが存在するか確認
- アプリケーションを再起動