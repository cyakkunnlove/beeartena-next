# 予約システムの修正内容

## 1. 初期表示の満員表示問題の修正

### 問題
- Firestoreから設定を読み込む前に、デフォルト設定の`maxCapacityPerSlot: 1`により満員表示になってしまう

### 解決策
`/lib/reservationService.ts`を以下のように修正：

1. **デフォルト値の変更**
   - `maxCapacityPerSlot`のデフォルト値を`1`から`10`に変更
   - これにより、Firestoreから設定を読み込むまでの間、予約可能と表示される

2. **設定読み込み状態の管理**
   - `isSettingsLoaded`フラグを追加して設定の読み込み状態を管理
   - `settingsLoadPromise`を保持して非同期処理を適切に管理

3. **待機メソッドの追加**
   - `waitForSettings()`メソッドを追加
   - `getTimeSlotsForDate()`と`getMonthAvailability()`で設定読み込みを待つ

## 2. 日付選択時の1日ずれ問題の修正

### 問題
- カレンダーで日付を選択すると1日前の日付が表示される（例：8月6日を選択→8月5日と表示）
- `toISOString()`を使用すると、タイムゾーンの影響でUTCに変換される

### 解決策

1. **Calendar.tsx の修正**
   ```typescript
   // 修正前
   const formatDate = (date: Date) => {
     return date.toISOString().split('T')[0]
   }

   // 修正後
   const formatDate = (date: Date) => {
     const year = date.getFullYear()
     const month = String(date.getMonth() + 1).padStart(2, '0')
     const day = String(date.getDate()).padStart(2, '0')
     return `${year}-${month}-${day}`
   }
   ```

2. **TimeSlots.tsx の修正**
   ```typescript
   // 修正前
   const selectedDate = new Date(date)

   // 修正後
   const [year, month, day] = date.split('-').map(Number)
   const selectedDate = new Date(year, month - 1, day)
   ```

## 3. 営業時間表示の動的読み込み

### 実装内容
`/components/reservation/BusinessHoursInfo.tsx`を以下のように修正：

1. **状態管理の追加**
   - `useState`で設定を管理
   - `isLoading`状態でローディング表示

2. **非同期読み込み**
   - `useEffect`でFirestoreから設定を読み込む
   - `reservationService.waitForSettings()`で設定読み込みを待つ

3. **リアルタイム更新**
   - `storage`イベントをリッスンして、設定変更時に自動更新
   - 他のタブで設定を変更した場合も反映される

4. **ローディング表示**
   - 設定読み込み中はスケルトンUIを表示

## 修正後の動作

1. **初期表示**
   - Firestoreから設定を読み込むまでの間、デフォルトで予約可能と表示
   - 設定読み込み後、実際の予約状況に基づいて表示を更新

2. **日付選択**
   - 選択した日付が正しく表示される（タイムゾーンの影響を受けない）

3. **営業時間表示**
   - Firestoreから最新の営業時間を自動取得
   - 設定変更時にリアルタイムで更新

## テスト

`/__tests__/reservation-fixes.test.tsx`にテストケースを追加：
- 初期設定のテスト
- localStorage優先のテスト
- 日付フォーマットのテスト