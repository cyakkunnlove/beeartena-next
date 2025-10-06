# BeeArtEna Next - Firestore データベース構造 詳細ドキュメント

このドキュメントは、beeartena-nextプロジェクトにおけるFirestoreデータベースの完全な構造と実装状況を記述したものです。

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [Firebase設定](#firebase設定)
3. [コレクション構造](#コレクション構造)
4. [型定義](#型定義)
5. [セキュリティルール](#セキュリティルール)
6. [インデックス設定](#インデックス設定)
7. [サービス実装](#サービス実装)
8. [API エンドポイント](#api-エンドポイント)
9. [認証システム](#認証システム)
10. [ポイントシステム](#ポイントシステム)
11. [予約システム](#予約システム)
12. [課題と注意点](#課題と注意点)

---

## プロジェクト概要

### プロジェクト情報
- **プロジェクト名**: BeeArtEna Next (まつ毛エクステンションサロン予約システム)
- **Firebaseプロジェクト ID**: beeart-ena
- **Firebaseプロジェクトの場所**: asia-northeast1 (東京)
- **使用技術スタック**:
  - Next.js 14 (App Router)
  - TypeScript
  - Firebase (Auth, Firestore, Storage)
  - Tailwind CSS
  - Vercel (ホスティング)
  - Redis/Upstash (キャッシング)

### 現在の状態
- **メンテナンスモード**: 有効 (`NEXT_PUBLIC_MAINTENANCE_MODE=true`)
- **既存予約データ**: リセット済み（システム改修のため）
- **運用状態**: メンテナンス中、LINE公式アカウントで予約受付中

---

## Firebase設定

### 接続設定 (`lib/firebase/config.ts`)

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // beeart-ena.firebaseapp.com
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // beeart-ena
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // beeart-ena.firebasestorage.app
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // 47862693911
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // 1:47862693911:web:f7181ecac113393d5c9c52
}
```

### Firebase Admin SDK 設定
- **サービスアカウントEmail**: firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com
- **用途**: サーバーサイドでの管理操作（ポイント付与、ユーザー管理など）

### 設定確認機能
```typescript
export const isFirebaseConfigured = () => {
  const apiKey = firebaseConfig.apiKey
  return apiKey && apiKey !== 'test-api-key' && apiKey !== ''
}
```
- Firebase未設定時はモックサービスにフォールバック
- 開発環境では設定状態をコンソールに出力

---

## コレクション構造

Firestoreデータベースには以下の7つの主要コレクションがあります：

### 1. `users` コレクション

**用途**: ユーザー（顧客・管理者）の基本情報を管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID = Firebase Auth UID
  email: string                     // メールアドレス（必須、ユニーク）
  name: string                      // 表示名
  phone: string                     // 電話番号
  role: 'customer' | 'admin'        // ユーザーロール
  points?: number                   // 現在のポイント残高
  birthday?: string                 // 誕生日 (YYYY-MM-DD形式)
  lastBirthdayPointsYear?: number   // 誕生日ポイント最終付与年
  totalSpent?: number               // 累計利用金額
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'  // ランク
  createdAt: Timestamp              // 作成日時
  updatedAt: Timestamp              // 更新日時
  deleted?: boolean                 // 論理削除フラグ
  deletedAt?: Timestamp             // 削除日時
  deletedBy?: string                // 削除実行者
}
```

**特記事項**:
- ドキュメントIDはFirebase AuthのUIDと一致
- ランク判定基準: Bronze (0円〜), Silver (100,000円〜), Gold (300,000円〜), Platinum (500,000円〜)
- 論理削除を採用（物理削除はしない）

---

### 2. `reservations` コレクション

**用途**: 予約情報の管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID (UUID v4)
  customerId: string | null         // ユーザーID（未登録ユーザーの場合null）
  customerName: string              // 予約者名
  customerEmail: string             // 予約者メールアドレス
  customerPhone: string             // 予約者電話番号
  serviceType: '2D' | '3D' | '4D' | 'wax' | string  // サービスタイプ
  serviceName: string               // サービス名
  price: number                     // 基本料金
  maintenanceOptions?: string[]     // メンテナンスオプション
  maintenancePrice?: number         // メンテナンス料金
  totalPrice?: number               // 合計金額
  date: string                      // 予約日 (YYYY-MM-DD形式の文字列)
  time: string                      // 予約時刻 (HH:MM形式)
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string                    // 備考
  createdAt: Timestamp              // 作成日時
  updatedAt: Timestamp              // 更新日時
  createdBy?: string                // 作成者UID（管理者代理作成時）
  completedAt?: Timestamp           // 完了日時
  cancelReason?: string             // キャンセル理由
  cancelledAt?: Timestamp           // キャンセル日時
  isMonitor?: boolean               // モニター価格適用フラグ
  finalPrice?: number               // 最終支払額（ポイント利用後）
  pointsUsed?: number               // 使用ポイント数
}
```

**重要な設計判断**:
- `date`フィールドは文字列型（YYYY-MM-DD）で保存
  - 理由: タイムゾーン問題を回避、日付範囲クエリの簡素化
  - Firestore複合クエリ: `where('date', '>=', startDate).where('date', '<=', endDate)`
- `customerId`がnullを許容
  - 未登録ユーザーでも予約可能にするため
- ステータス遷移: pending → confirmed → completed (または cancelled)

---

### 3. `points` コレクション

**用途**: ポイント取引履歴の管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID (UUID v4)
  userId: string                    // ユーザーID
  type: 'earned' | 'used' | 'manual' | 'expired' | 'adjusted' | 'redeemed'
  amount: number                    // ポイント数（付与時は正、使用時は正で記録）
  balance?: number                  // 取引後の残高
  description?: string              // 説明文
  reason?: string                   // 理由
  referenceId?: string              // 関連する予約IDなど
  createdAt: Timestamp              // 作成日時
}
```

**ポイントルール**:
- 予約完了時: 支払額の5%還元
- 誕生日: 年1回500ポイント付与（自動バッチ処理）
- ランクアップボーナス:
  - Bronze: 100pt
  - Silver: 300pt
  - Gold: 500pt
  - Platinum: 1000pt
- ポイントは読み取り専用（作成のみ、編集・削除不可）
- ポイント残高は`users`コレクションの`points`フィールドで管理

**トランザクション制御**:
```typescript
await runTransaction(db, async (transaction) => {
  // 1. ユーザーのポイント残高を更新
  transaction.update(userRef, { points: increment(amount) })
  // 2. ポイント履歴を記録
  transaction.set(pointRef, pointHistory)
})
```

---

### 4. `service-plans` コレクション

**用途**: サービスメニュー（施術プラン）の管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID (例: 'plan-2d', 'plan-3d')
  type: '2D' | '3D' | '4D' | 'wax' | 'retouch' | string
  name: string                      // プラン名
  description: string               // 説明
  price: number                     // 通常価格
  monitorPrice?: number             // モニター価格
  otherShopPrice?: number           // 他店価格（参考）
  duration: number                  // 所要時間（分）
  image?: string                    // 画像URL
  badge?: string                    // バッジ表示（例: "人気No.1"）
  isFeatured?: boolean              // おすすめプランフラグ
  tags?: string[]                   // タグ
  isPublished: boolean              // 公開状態
  effectiveFrom: string             // 有効開始日 (ISO 8601)
  effectiveUntil?: string           // 有効終了日 (ISO 8601)
  displayOrder: number              // 表示順序
  createdAt: Timestamp              // 作成日時
  updatedAt: Timestamp              // 更新日時
}
```

**デフォルトプラン** (6種類):
1. **2Dまつ毛エクステ** (plan-2d)
   - 通常: 8,000円 / モニター: 6,000円 / 他店: 9,000円
   - 所要時間: 90分

2. **3Dまつ毛エクステ** (plan-3d)
   - 通常: 10,000円 / モニター: 8,000円 / 他店: 11,000円
   - 所要時間: 120分

3. **4Dまつ毛エクステ** (plan-4d) ★人気No.1
   - 通常: 12,000円 / モニター: 10,000円 / 他店: 14,000円
   - 所要時間: 150分
   - バッジ: "人気No.1"
   - おすすめプラン: true

4. **眉毛ワックス脱毛** (plan-brow-wax)
   - 通常: 3,000円 / モニター: 2,500円
   - 所要時間: 30分

5. **3ヶ月以内リタッチ** (plan-retouch-3m)
   - 価格: 11,000円
   - 所要時間: 90分
   - バッジ: "リピーター限定"

6. **半年以内リタッチ** (plan-retouch-6m)
   - 価格: 15,000円
   - 所要時間: 90分

---

### 5. `settings` コレクション

**用途**: システム設定（営業時間、予約枠設定など）

**主要ドキュメント**: `reservation-settings`

**フィールド構造**:
```typescript
{
  slotDuration: number              // 予約枠の長さ（分）デフォルト: 120
  maxCapacityPerSlot: number        // 1枠あたりの最大予約数 デフォルト: 1
  businessHours: BusinessHours[]    // 営業時間設定（曜日別）
  blockedDates?: string[]           // 休業日リスト (ISO 8601 date strings)
  cancellationDeadlineHours?: number // キャンセル期限（時間前） デフォルト: 24
  cancellationPolicy?: string       // キャンセルポリシー文言
  updatedAt: Date                   // 更新日時
}

// BusinessHours 型
{
  dayOfWeek: number                 // 0-6 (日曜-土曜)
  open: string                      // 開店時刻 "09:00"
  close: string                     // 閉店時刻 "18:00"
  isOpen: boolean                   // 営業日フラグ
  allowMultipleSlots?: boolean      // 複数予約枠を許可
  slotInterval?: number             // 枠の間隔（分）
  maxCapacityPerDay?: number        // 1日の最大受付数 デフォルト: 1
}
```

**設定の読み取り・保存**:
- 誰でも読み取り可能（予約画面で使用）
- 管理者のみ書き込み可能
- データ検証とサニタイズ処理を実装

---

### 6. `announcements` コレクション

**用途**: お知らせ・キャンペーン情報の管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID
  title: string                     // タイトル
  body: string                      // 本文
  publishAt: string                 // 公開開始日時 (ISO 8601)
  expiresAt?: string                // 公開終了日時 (ISO 8601)
  isPinned: boolean                 // ピン留めフラグ
  priority: number                  // 優先度（数値が大きいほど上位表示）
  createdAt: Timestamp              // 作成日時
  updatedAt: Timestamp              // 更新日時
}
```

**表示ロジック**:
- `publishAt <= 現在時刻` かつ `(expiresAt が未設定 または expiresAt > 現在時刻)` のもののみ表示
- ソート順: `priority DESC`, `publishAt DESC`

---

### 7. `inquiries` コレクション

**用途**: 問い合わせ管理

**フィールド構造**:
```typescript
{
  id: string                        // ドキュメントID (UUID v4)
  name: string                      // 問い合わせ者名
  email: string                     // メールアドレス
  phone?: string                    // 電話番号（任意）
  type: 'general' | 'menu' | 'booking' | 'aftercare' | 'other'
  message: string                   // 問い合わせ内容
  status: 'unread' | 'read' | 'replied'
  reply?: string                    // 返信内容
  repliedAt?: Timestamp             // 返信日時
  createdAt: Timestamp              // 作成日時
  updatedAt: Timestamp              // 更新日時
}
```

**アクセス制御**:
- 作成: 誰でも可能（未認証ユーザーでも問い合わせ可能）
- 読み取り・更新・削除: 管理者のみ

---

## 型定義

### 主要型定義ファイル: `lib/types.ts`

このファイルには全てのFirestore関連の型定義が含まれています。

**重要な型**:

```typescript
// ユーザー型
export interface User {
  id: string
  email: string
  name: string
  phone: string
  role: 'customer' | 'admin'
  points?: number
  birthday?: string
  lastBirthdayPointsYear?: number
  createdAt: Date
  updatedAt: Date
}

// 予約型
export interface Reservation {
  id: string
  customerId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceType: '2D' | '3D' | '4D' | 'wax' | string
  serviceName: string
  price: number
  maintenanceOptions?: string[]
  maintenancePrice?: number
  totalPrice?: number
  date: string  // YYYY-MM-DD形式
  time: string  // HH:MM形式
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelReason?: string
  cancelledAt?: Date
  isMonitor?: boolean
  finalPrice?: number
  pointsUsed?: number
}

// ポイント履歴型
export interface PointTransaction {
  id: string
  userId: string
  type: 'earned' | 'used' | 'manual' | 'expired' | 'adjusted' | 'redeemed'
  amount: number
  balance?: number
  description?: string
  reason?: string
  referenceId?: string
  createdAt: string | Date
}

// Firestore Timestamp 型ガード
export function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    'nanoseconds' in value &&
    'toDate' in value
  )
}
```

---

## セキュリティルール

### ファイル: `firestore.rules`

**基本方針**:
- 認証必須（一部を除く）
- ロールベースアクセス制御（RBAC）
- 所有者ベース権限
- 管理者特権

**ヘルパー関数**:
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function isAdminUser() {
  return isAuthenticated() &&
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**コレクション別ルール**:

1. **users**
   - 読み取り: 自分のドキュメント または 管理者
   - 作成: 認証済みユーザーが自分のドキュメントのみ
   - 更新: 所有者 または 管理者
   - 削除: 管理者のみ

2. **reservations**
   - 読み取り: 予約者本人 または 管理者
   - 作成: 認証済みユーザー
   - 更新: 予約者本人 または 管理者
   - 削除: 管理者のみ

3. **points**
   - 読み取り: ポイント所有者 または 管理者
   - 作成・更新・削除: 不可（サーバーサイドのみ）

4. **inquiries**
   - 読み取り: 管理者のみ
   - 作成: 誰でも可能（未認証含む）
   - 更新・削除: 管理者のみ

5. **settings, service-plans, announcements**
   - 読み取り: 誰でも可能
   - 書き込み: 管理者のみ

---

## インデックス設定

### ファイル: `firestore.indexes.json`

**複合インデックス**:

1. **reservations - 日付とステータス**
   ```
   date (ASC) + status (ASC)
   ```
   用途: 特定日のステータス別予約取得

2. **reservations - ユーザー別予約（降順）**
   ```
   customerId (ASC) + date (DESC)
   ```
   用途: ユーザーの予約履歴表示

3. **reservations - 日付と時刻**
   ```
   date (ASC) + time (ASC)
   ```
   用途: カレンダー表示での時系列ソート

4. **reservations - 月次availability**
   ```
   date (ASC) + status (ASC)
   ```
   用途: 月間予約可能枠の高速検索

5. **service-plans - 公開状態と表示順**
   ```
   isPublished (ASC) + displayOrder (ASC)
   ```
   用途: 公開中のプランを表示順でソート

6. **announcements - 公開日と優先度**
   ```
   publishAt (DESC) + priority (DESC)
   ```
   用途: お知らせの表示順序制御

**フィールドオーバーライド**:
- `reservations.date`: 昇順・降順インデックス
- `reservations.status`: array-contains クエリ対応

---

## サービス実装

各コレクションへのアクセスは専用のサービスモジュールで管理されています。

### 1. User Service (`lib/firebase/users.ts`)

**主要メソッド**:
- `createUser(user: User)`: ユーザー作成
- `getUser(id: string)`: ユーザー取得
- `getUserByEmail(email: string)`: メールアドレスで検索
- `getAllUsers()`: 全ユーザー取得（管理者用）
- `updateUser(id: string, updates: Partial<User>)`: ユーザー情報更新
- `updateTotalSpent(userId: string, amount: number)`: 累計利用金額更新
- `deleteCustomerByAdmin(customerId: string)`: 論理削除
- `calculateUserRank(totalSpent: number)`: ランク計算

**モックフォールバック**:
Firebase未設定時は`mockUserService`にフォールバック

---

### 2. Reservation Service (`lib/firebase/reservations.ts`)

**主要メソッド**:
- `createReservation(reservation)`: 予約作成
- `getReservation(id: string)`: 予約取得
- `getUserReservations(userId: string)`: ユーザーの予約一覧
- `getAllReservations()`: 全予約取得（管理者用）
- `updateReservationStatus(id, status, updatedBy?)`: ステータス更新
- `cancelReservation(id: string, reason?: string)`: 予約キャンセル
- `getReservationsByDate(date: Date)`: 日付で予約検索
- `getReservationsByMonth(year: number, month: number)`: 月単位バッチ取得

**パフォーマンス最適化**:
- クライアントサイドではAPIエンドポイント経由
- サーバーサイドでは直接Firestoreにアクセス
- 月次データはMap型でキャッシュ効率向上

**date フィールドの扱い**:
```typescript
// 保存時: 文字列のまま保存
date: newReservation.date  // "2025-10-15"

// 取得時: 文字列のまま返す
date: data.date  // "2025-10-15"

// 検索時: 文字列比較
where('date', '>=', '2025-10-01')
where('date', '<=', '2025-10-31')
```

---

### 3. Point Service (`lib/firebase/points.ts`)

**主要メソッド**:
- `addPoints(userId, amount, description, type)`: ポイント付与
- `usePoints(userId, amount, description)`: ポイント使用
- `getUserPointHistory(userId)`: ポイント履歴取得
- `getUserPoints(userId)`: 現在のポイント残高取得
- `addReservationPoints(userId, reservationAmount)`: 予約完了時ポイント付与（5%還元）
- `addRankBonus(userId, rank)`: ランクボーナス付与

**トランザクション処理**:
```typescript
await runTransaction(db, async (transaction) => {
  // 1. ユーザーポイント残高を更新
  transaction.update(userRef, {
    points: increment(amount)  // アトミックな加算
  })

  // 2. ポイント履歴を記録
  transaction.set(pointRef, {
    ...pointHistory,
    createdAt: Timestamp.fromDate(new Date())
  })
})
```

**ポイント計算ロジック**:
- 予約完了時: `Math.floor(reservationAmount * 0.05)`
- ランクボーナス: bronze: 100pt, silver: 300pt, gold: 500pt, platinum: 1000pt

---

### 4. Service Plan Service (`lib/firebase/servicePlans.ts`)

**主要メソッド**:
- `getServicePlans()`: 公開中のプラン取得
- `getAllServicePlans()`: 全プラン取得（管理者用）
- `getServicePlanById(id: string)`: プラン取得
- `createServicePlan(plan)`: プラン作成
- `updateServicePlan(id, updates)`: プラン更新
- `deleteServicePlan(id)`: プラン削除

**デフォルトデータ**:
6種類のデフォルトプランが定義済み（初期セットアップ時に登録）

**エラーハンドリング**:
作成・更新時のエラーを詳細にログ出力（デバッグ用）

---

### 5. Settings Service (`lib/firebase/settings.ts`)

**主要メソッド**:
- `getSettings()`: 設定取得
- `saveSettings(settings)`: 設定保存

**データ検証・サニタイズ**:
```typescript
// 営業時間の正規化
businessHours.map(hours => ({
  dayOfWeek: hours.dayOfWeek,
  open: hours.open || '',
  close: hours.close || '',
  isOpen: Boolean(hours.isOpen),
  allowMultipleSlots: Boolean(hours.allowMultipleSlots),
  maxCapacityPerDay: Number.isFinite(hours.maxCapacityPerDay)
    ? Number(hours.maxCapacityPerDay)
    : 1,
  slotInterval: allowMultipleSlots
    ? (Number.isFinite(hours.slotInterval) ? hours.slotInterval : 30)
    : undefined
}))
```

---

### 6. Announcement Service (`lib/firebase/announcements.ts`)

**主要メソッド**:
- `getActiveAnnouncements()`: 公開中のお知らせ取得
- `getAllAnnouncements()`: 全お知らせ取得（管理者用）
- `getAnnouncementById(id)`: お知らせ取得
- `createAnnouncement(announcement)`: お知らせ作成
- `updateAnnouncement(id, updates)`: お知らせ更新
- `deleteAnnouncement(id)`: お知らせ削除

**公開判定ロジック**:
```typescript
const now = new Date().toISOString()
// 公開開始日が過去 かつ 期限切れでない
announcements.filter((ann) => {
  if (!ann.expiresAt) return true
  return new Date(ann.expiresAt) > new Date()
})
```

---

### 7. Inquiry Service (`lib/firebase/inquiries.ts`)

**主要メソッド**:
- `createInquiry(inquiry)`: 問い合わせ作成
- `getInquiry(id)`: 問い合わせ取得
- `getAllInquiries()`: 全問い合わせ取得（管理者用）
- `updateInquiryStatus(id, status)`: ステータス更新
- `replyToInquiry(id, reply)`: 返信追加

---

## API エンドポイント

### 認証関連 (`/api/auth/*`)

1. **POST /api/auth/register** - ユーザー登録
2. **POST /api/auth/login** - ログイン
3. **POST /api/auth/logout** - ログアウト
4. **GET /api/auth/me** - 現在のユーザー情報取得
5. **POST /api/auth/change-password** - パスワード変更
6. **DELETE /api/auth/delete-account** - アカウント削除
7. **GET /api/auth/debug-config** - Firebase設定デバッグ

### 予約関連 (`/api/reservations/*`)

1. **GET /api/reservations** - 予約一覧取得
2. **POST /api/reservations/create** - 予約作成
3. **GET /api/reservations/[id]** - 予約詳細取得
4. **PUT /api/reservations/[id]** - 予約更新
5. **GET /api/reservations/by-date?date=YYYY-MM-DD** - 日付別予約取得
6. **GET /api/reservations/availability?year=2025&month=10** - 月間予約状況取得
7. **GET /api/reservations/slots?date=YYYY-MM-DD** - 予約可能枠取得

### ポイント関連 (`/api/points/*`)

1. **GET /api/points** - ポイント履歴取得
2. **GET /api/points/balance** - ポイント残高取得
3. **POST /api/points/birthday** - 誕生日ポイント付与（バッチ処理用）

### 顧客管理 (`/api/customers/*`)

1. **GET /api/customers** - 顧客一覧取得（管理者用）
2. **GET /api/customers/[id]** - 顧客詳細取得（管理者用）

### 管理者機能 (`/api/admin/*`)

1. **GET /api/admin/stats** - ダッシュボード統計
2. **GET /api/admin/performance** - パフォーマンス指標
3. **POST /api/admin/birthday-points** - 誕生日ポイント一括付与
4. **DELETE /api/admin/customers/[id]** - 顧客削除（論理削除）

### その他

1. **GET /api/settings** - システム設定取得
2. **POST /api/settings** - システム設定保存（管理者用）
3. **GET /api/inquiries** - 問い合わせ一覧取得（管理者用）
4. **POST /api/inquiries** - 問い合わせ作成
5. **GET /api/health** - ヘルスチェック
6. **GET /api/debug-env** - 環境変数デバッグ
7. **GET /api/test** - テスト用エンドポイント

### API v1 (RESTful API) (`/api/v1/*`)

1. **GET /api/v1** - API情報
2. **GET /api/v1/docs** - Swagger/OpenAPI ドキュメント
3. **GET /api/v1/reservations** - 予約一覧（v1）

---

## 認証システム

### Firebase Authentication

**サポート認証方法**:
- メール/パスワード認証

**認証フロー**:
1. クライアント: Firebase Auth SDK でログイン
2. サーバー: Firebase Admin SDK でトークン検証
3. セッション管理: JWTトークン使用

**Auth Context** (`lib/auth/authService.ts`):
```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email, password, name, phone, birthday?) => Promise<User>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<User>
}
```

**ユーザー登録プロセス**:
1. Firebase Auth でユーザー作成
2. Firestore `users` コレクションにプロフィール保存
3. 初期ポイント付与（該当する場合）
4. ウェルカムメール送信（Resend経由）

---

## ポイントシステム

### ポイント付与タイミング

1. **新規登録時**
   - 現在は付与なし（将来的に追加可能）

2. **予約完了時**
   - 支払額の5%還元
   - `pointService.addReservationPoints(userId, totalPrice)`

3. **誕生日**
   - 年1回500ポイント自動付与
   - バッチ処理: `/api/admin/birthday-points`
   - `lastBirthdayPointsYear` で重複付与防止

4. **ランクアップ時**
   - ランクボーナスポイント
   - `pointService.addRankBonus(userId, newRank)`

5. **管理者による手動付与**
   - 任意のポイント数を付与可能
   - `type: 'manual'`

### ポイント使用

**使用制限**:
- 予約時のみ使用可能
- 1ポイント = 1円換算
- 残高不足時はエラー

**使用フロー**:
```typescript
// 1. ポイント使用可能額の計算
const availablePoints = await pointService.getUserPoints(userId)
const maxUsablePoints = Math.min(availablePoints, totalPrice)

// 2. ポイント使用
await pointService.usePoints(userId, pointsToUse, `予約ID: ${reservationId} でポイント使用`)

// 3. 予約の最終金額更新
await reservationService.updateReservation(reservationId, {
  pointsUsed: pointsToUse,
  finalPrice: totalPrice - pointsToUse
})
```

### 誕生日ポイントバッチ処理

**実装**: `lib/services/birthdayPoints.ts`

**処理ロジック**:
```typescript
export async function processBirthdayPoints() {
  const today = new Date()
  const currentYear = today.getFullYear()
  const todayMMDD = format(today, 'MM-dd')  // "10-06"

  // 今日が誕生日のユーザーを取得
  const users = await getAllUsers()
  const birthdayUsers = users.filter(user => {
    if (!user.birthday) return false
    const birthdayMMDD = user.birthday.slice(5)  // "YYYY-MM-DD" → "MM-DD"
    return birthdayMMDD === todayMMDD
  })

  // 今年まだポイント付与していないユーザーに付与
  for (const user of birthdayUsers) {
    if (user.lastBirthdayPointsYear !== currentYear) {
      await pointService.addPoints(
        user.id,
        500,
        `誕生日ポイント ${currentYear}`,
        'earned'
      )
      await userService.updateUser(user.id, {
        lastBirthdayPointsYear: currentYear
      })
    }
  }
}
```

**実行方法**:
- 手動: `POST /api/admin/birthday-points`
- 自動: Vercel Cron Jobs（将来実装予定）

---

## 予約システム

### 予約可能枠の計算

**設定値**:
- `slotDuration`: 予約枠の長さ（デフォルト120分）
- `maxCapacityPerSlot`: 1枠あたりの最大予約数（デフォルト1）
- `maxCapacityPerDay`: 1日の最大予約数（デフォルト1）
- `businessHours`: 曜日別営業時間

**枠生成ロジック**:
```typescript
function generateTimeSlots(date: Date, settings: ReservationSettings) {
  const dayOfWeek = date.getDay()
  const businessHour = settings.businessHours.find(h => h.dayOfWeek === dayOfWeek)

  if (!businessHour || !businessHour.isOpen) {
    return []  // 定休日
  }

  const slots = []
  const [openHour, openMin] = businessHour.open.split(':').map(Number)
  const [closeHour, closeMin] = businessHour.close.split(':').map(Number)

  let currentTime = openHour * 60 + openMin
  const endTime = closeHour * 60 + closeMin

  while (currentTime + settings.slotDuration <= endTime) {
    const hour = Math.floor(currentTime / 60)
    const min = currentTime % 60
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`

    slots.push({
      time: timeStr,
      available: true,  // 後で予約状況を確認
      maxCapacity: settings.maxCapacityPerSlot,
      currentBookings: 0
    })

    currentTime += settings.slotDuration
  }

  return slots
}
```

### 予約可能判定

**チェック項目**:
1. 日付が休業日でないか
2. 曜日が営業日か
3. 時刻が営業時間内か
4. その時間帯の予約数が上限に達していないか
5. その日の予約数が上限に達していないか

**実装**:
```typescript
async function checkAvailability(date: string, time: string) {
  const settings = await settingsService.getSettings()

  // 1. 休業日チェック
  if (settings.blockedDates?.includes(date)) {
    return false
  }

  // 2. 営業日・時間チェック
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()
  const businessHour = settings.businessHours.find(h => h.dayOfWeek === dayOfWeek)

  if (!businessHour?.isOpen) {
    return false
  }

  // 3. 予約数チェック
  const reservations = await reservationService.getReservationsByDate(dateObj)
  const activeReservations = reservations.filter(r => r.status !== 'cancelled')

  // その時間帯の予約数
  const timeSlotReservations = activeReservations.filter(r => r.time === time)
  if (timeSlotReservations.length >= settings.maxCapacityPerSlot) {
    return false
  }

  // 1日の予約数
  if (activeReservations.length >= (businessHour.maxCapacityPerDay ?? 1)) {
    return false
  }

  return true
}
```

### キャンセルポリシー

**デフォルト設定**:
- 予約日の24時間前までキャンセル可能
- それ以降は電話連絡が必要

**実装**:
```typescript
function canCancelOnline(reservation: Reservation) {
  const now = new Date()
  const reservationDateTime = new Date(`${reservation.date}T${reservation.time}:00`)
  const deadlineHours = settings.cancellationDeadlineHours ?? 24
  const deadline = new Date(reservationDateTime.getTime() - deadlineHours * 60 * 60 * 1000)

  return now < deadline
}
```

---

## 課題と注意点

### 1. 既知の問題

#### ポイント関連
- ポイント有効期限の管理が未実装
- ポイント失効処理が必要
- ポイント履歴のページネーションが必要（大量データ対策）

#### 予約システム
- 同時予約競合の処理が弱い
  - トランザクション制御の強化が必要
- 予約枠の動的調整機能がない
- リマインダーメール送信が未実装

#### セキュリティ
- Admin SDK の秘密鍵が環境変数に平文保存
  - Secret Manager の利用を推奨
- API レートリミットが一部エンドポイントで未設定
- CSRF 対策の強化が必要

### 2. パフォーマンス最適化が必要な箇所

1. **月間予約取得**
   - 現在: 毎回Firestoreクエリ
   - 改善案: Redis キャッシュ活用（実装済みだが未活用）

2. **ユーザー一覧取得**
   - 現在: 全件取得
   - 改善案: ページネーション実装

3. **ポイント履歴**
   - 現在: 全件取得
   - 改善案: 無限スクロール/ページネーション

### 3. 今後の実装予定機能

1. **通知システム**
   - 予約確認メール
   - リマインダーメール
   - キャンセル通知

2. **レポート機能**
   - 売上レポート
   - 顧客分析
   - サービス別統計

3. **LINE連携**
   - LINE Login
   - LINE メッセージング
   - LINE予約ボット

4. **決済連携**
   - Stripe 統合
   - オンライン決済
   - 定期支払い

5. **予約管理強化**
   - ウェイティングリスト
   - 予約変更履歴
   - 自動リマインダー

### 4. データ移行・メンテナンス

**現在の状況**:
- メンテナンスモード有効中
- 既存予約データはリセット済み
- ユーザーデータは保持（要確認）

**移行手順（メンテナンス解除時）**:
1. Firestore データの整合性確認
2. インデックスの再構築
3. 環境変数 `NEXT_PUBLIC_MAINTENANCE_MODE=false` に変更
4. Vercel で再デプロイ
5. 本番環境でスモークテスト実行
6. ユーザーへの告知

### 5. モニタリング・ログ

**実装済み**:
- API エンドポイントでのエラーログ
- Firebase設定状態のデバッグログ
- トランザクションエラーログ

**未実装**:
- アプリケーション全体のモニタリング
- パフォーマンスメトリクス
- エラーレート追跡
- ユーザー行動分析

**推奨ツール**:
- Vercel Analytics
- Sentry (エラートラッキング)
- Firebase Performance Monitoring

---

## まとめ

このドキュメントはbeeartena-nextプロジェクトのFirestoreデータベース構造と実装の完全な状態を記録したものです。

**主要な特徴**:
- ✅ 7つのコレクションによる明確なデータ分離
- ✅ 型安全性の高いTypeScript実装
- ✅ 包括的なセキュリティルール
- ✅ パフォーマンスを考慮したインデックス設計
- ✅ モックフォールバック機能（開発環境）
- ✅ トランザクション制御による整合性保証

**注意点**:
- メンテナンスモード中のため本番環境は一時停止
- 一部機能（通知、決済など）は未実装
- パフォーマンス最適化の余地あり

このドキュメントを基に、他のAIエージェントや開発者がプロジェクトの現状を正確に把握し、適切な開発や保守作業を行うことができます。
