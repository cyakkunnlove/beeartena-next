# ⚠️ Firebase設定の完了が必要です

## 現在の状況
Firebase設定が部分的にしか完了していません。以下の値が不足しています：

- ✅ API Key: `AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA`
- ✅ Auth Domain: `beeart-ena.firebaseapp.com` (修正済み)
- ✅ Project ID: `beeart-ena`
- ❌ **Storage Bucket**: 未設定
- ❌ **Messaging Sender ID**: 未設定
- ❌ **App ID**: 未設定

## 🔧 設定を完了する方法

### 1. Firebase Consoleで値を取得
1. https://console.firebase.google.com/project/beeart-ena/settings/general にアクセス
2. 「マイアプリ」セクションでWebアプリを確認
3. firebaseConfigから不足している値をコピー

### 2. .env.localを更新
```bash
# 以下のコマンドで編集
nano .env.local
```

以下の値を更新：
```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beeart-ena.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=47862693911
NEXT_PUBLIC_FIREBASE_APP_ID=1:47862693911:web:xxxxxxxxxxxxx
```

### 3. JWT_SECRETを変更
```
JWT_SECRET=your-unique-secret-key-here-change-this
```

## 🚀 設定完了後の手順

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **動作確認**
   - http://localhost:3000 にアクセス
   - 管理者ログイン: admin@beeartena.jp

3. **Firebaseの有効化**
   - [Firestore](https://console.firebase.google.com/project/beeart-ena/firestore) を有効化
   - [Authentication](https://console.firebase.google.com/project/beeart-ena/authentication) でメール/パスワードを有効化

## 📌 重要
現在はモックモードで動作しているため、Firebaseが未設定でも基本機能は使用できます。
本番環境では必ずFirebase設定を完了してください。