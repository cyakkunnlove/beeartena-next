# Firestoreセキュリティルール更新手順

## 📋 手順

1. **Firebaseコンソールにアクセス**
   - URL: https://console.firebase.google.com/project/beeart-ena/firestore/rules

2. **現在のルールを確認**
   - 現在、すべてのアクセスを許可する設定になっている可能性があります

   ```
   match /{document=**} {
     allow read, write: if true;
   }
   ```

3. **本番用ルールに更新**
   - 以下のルールをコピーして、Firebaseコンソールのルールエディタに貼り付けてください：

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
      allow delete: if false; // ユーザーの削除は禁止
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
      allow update: if false; // ポイント履歴の更新は禁止
      allow delete: if false; // ポイント履歴の削除は禁止
    }

    // 設定情報
    match /settings/{document} {
      allow read: if true; // 誰でも読み取り可能（営業時間など）
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // サービスメニュー
    match /services/{serviceId} {
      allow read: if true; // 誰でも読み取り可能
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // 問い合わせ
    match /inquiries/{inquiryId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if true; // 誰でも問い合わせ可能
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if false; // 問い合わせの削除は禁止
    }

    // 旧customers/reservations/inquiriesへの互換性（移行期間用）
    match /customers/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **「公開」ボタンをクリック**
   - ルールが正常に更新されたことを確認

## 🔒 セキュリティルールの説明

### ユーザー情報 (`users`)

- 読み取り: 本人または管理者のみ
- 作成: 本人のみ（サインアップ時）
- 更新: 本人または管理者のみ
- 削除: 禁止

### 予約情報 (`reservations`)

- 読み取り: 予約者本人または管理者のみ
- 作成: ログインユーザーなら誰でも可能
- 更新: 予約者本人または管理者のみ
- 削除: 管理者のみ

### ポイント履歴 (`pointTransactions`)

- 読み取り: 本人または管理者のみ
- 作成: 管理者のみ
- 更新・削除: 禁止（履歴の改ざん防止）

### 設定情報 (`settings`)

- 読み取り: 誰でも可能（営業時間などの公開情報）
- 書き込み: 管理者のみ

### サービスメニュー (`services`)

- 読み取り: 誰でも可能（公開情報）
- 書き込み: 管理者のみ

### 問い合わせ (`inquiries`)

- 読み取り: 問い合わせ者本人または管理者のみ
- 作成: 誰でも可能（ログイン不要）
- 更新: 管理者のみ
- 削除: 禁止

## ⚠️ 注意事項

- ルールを更新すると、すぐに本番環境に反映されます
- 更新前に必ずバックアップを取ることをお勧めします
- ルールに誤りがあると、アプリケーションが正常に動作しなくなる可能性があります
