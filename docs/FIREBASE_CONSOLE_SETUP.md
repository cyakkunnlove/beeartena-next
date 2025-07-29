# Firebase Console 手動セットアップ手順

このドキュメントでは、Firebase Consoleで手動で行う必要がある設定について説明します。

## 前提条件
- Firebase プロジェクトが作成済み（beeart-ena）
- Firebase Console にアクセス可能

## 1. Firebase Console にアクセス

1. [Firebase Console](https://console.firebase.google.com/) にログイン
2. プロジェクト「beeart-ena」を選択

## 2. Firestore Database のセットアップ

### 2.1 データベースの作成（未作成の場合）

1. 左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. 「本番環境モード」を選択
4. ロケーション: asia-northeast1 (東京)を選択
5. 「有効にする」をクリック

### 2.2 コレクションの作成

以下のコレクションを手動で作成します：

#### users コレクション
1. 「コレクションを開始」をクリック
2. コレクションID: `users`
3. 最初のドキュメント:
   - ドキュメントID: 自動ID
   - フィールド:
     ```
     email: "test@example.com" (string)
     name: "テストユーザー" (string)
     phone: "090-0000-0000" (string)
     role: "customer" (string)
     points: 0 (number)
     totalSpent: 0 (number)
     createdAt: 現在のタイムスタンプ
     updatedAt: 現在のタイムスタンプ
     ```

#### reservations コレクション
1. 「コレクションを開始」をクリック
2. コレクションID: `reservations`
3. 最初のドキュメント:
   - ドキュメントID: 自動ID
   - フィールド:
     ```
     customerId: "test-user-id" (string)
     customerName: "テストユーザー" (string)
     customerEmail: "test@example.com" (string)
     customerPhone: "090-0000-0000" (string)
     serviceType: "2D" (string)
     serviceName: "2D眉毛" (string)
     price: 30000 (number)
     date: "2024-01-15" (string)
     time: "10:00" (string)
     status: "pending" (string)
     createdAt: 現在のタイムスタンプ
     updatedAt: 現在のタイムスタンプ
     ```

#### points コレクション
1. 「コレクションを開始」をクリック
2. コレクションID: `points`
3. 最初のドキュメント:
   - ドキュメントID: 自動ID
   - フィールド:
     ```
     userId: "test-user-id" (string)
     amount: 100 (number)
     type: "earned" (string)
     reason: "新規登録ボーナス" (string)
     createdAt: 現在のタイムスタンプ
     ```

#### inquiries コレクション
1. 「コレクションを開始」をクリック
2. コレクションID: `inquiries`
3. 最初のドキュメント:
   - ドキュメントID: 自動ID
   - フィールド:
     ```
     name: "問い合わせ太郎" (string)
     email: "inquiry@example.com" (string)
     phone: "090-1111-1111" (string)
     message: "テスト問い合わせです" (string)
     status: "unread" (string)
     createdAt: 現在のタイムスタンプ
     updatedAt: 現在のタイムスタンプ
     ```

#### settings コレクション
1. 「コレクションを開始」をクリック
2. コレクションID: `settings`
3. ドキュメントID: `reservation_settings` （固定）
4. フィールド:
   ```
   slotDuration: 120 (number)
   maxCapacityPerSlot: 1 (number)
   businessHours: [配列] (array)
   blockedDates: [] (array)
   updatedAt: 現在のタイムスタンプ
   ```

businessHours配列の内容:
```javascript
[
  {"dayOfWeek": 0, "open": "", "close": "", "isOpen": false},
  {"dayOfWeek": 1, "open": "18:30", "close": "20:30", "isOpen": true},
  {"dayOfWeek": 2, "open": "18:30", "close": "20:30", "isOpen": true},
  {"dayOfWeek": 3, "open": "09:00", "close": "17:00", "isOpen": true},
  {"dayOfWeek": 4, "open": "18:30", "close": "20:30", "isOpen": true},
  {"dayOfWeek": 5, "open": "18:30", "close": "20:30", "isOpen": true},
  {"dayOfWeek": 6, "open": "18:30", "close": "20:30", "isOpen": true}
]
```

### 2.3 セキュリティルールの設定

1. Firestore Database の「ルール」タブを選択
2. 以下の内容をコピーして貼り付け:

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
      allow update: if false;
      allow delete: if false;
    }
    
    // Inquiries collection
    match /inquiries/{inquiryId} {
      allow read: if isAdmin();
      allow create: if true;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Settings collection
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

3. 「公開」ボタンをクリック

### 2.4 複合インデックスの作成

必要に応じて、以下のインデックスを作成します：

1. Firestore Database の「インデックス」タブを選択
2. 「インデックスを作成」をクリック
3. 以下のインデックスを作成:

**reservations コレクション用**
- コレクション: reservations
- フィールド1: customerId (昇順)
- フィールド2: date (降順)

## 3. Authentication の設定

### 3.1 メール/パスワード認証を有効化

1. 左メニューから「Authentication」を選択
2. 「Sign-in method」タブを選択
3. 「メール/パスワード」を有効化

### 3.2 管理者ユーザーの作成

1. 「Users」タブを選択
2. 「ユーザーを追加」をクリック
3. 管理者情報を入力:
   - メール: admin@beeartena.jp
   - パスワード: 安全なパスワード
4. 作成されたユーザーのUIDをコピー

### 3.3 管理者データの作成

1. Firestore Database に戻る
2. users コレクションで、先ほどコピーしたUIDでドキュメントを作成
3. フィールド:
   ```
   email: "admin@beeartena.jp" (string)
   name: "管理者" (string)
   phone: "090-5278-5221" (string)
   role: "admin" (string)
   points: 0 (number)
   totalSpent: 0 (number)
   createdAt: 現在のタイムスタンプ
   updatedAt: 現在のタイムスタンプ
   ```

## 4. 動作確認

1. アプリケーションを起動
2. 管理者アカウントでログイン
3. 各機能が正常に動作することを確認

## トラブルシューティング

### 権限エラーが発生する場合
- セキュリティルールが正しく設定されているか確認
- ユーザーのroleフィールドが正しく設定されているか確認
- Authenticationでユーザーが正しく作成されているか確認

### データが表示されない場合
- コレクション名が正しいか確認
- フィールド名の大文字小文字が正しいか確認
- Firebaseコンソールでデータが存在することを確認