# 予約ページパフォーマンス最適化ガイド

## 問題の特定

予約ページの読み込みが遅い主な原因：

1. **Firestoreクエリの問題**
   - `status != 'cancelled'` の不等号クエリがインデックスを必要とする
   - 月間予約の取得で適切なインデックスが設定されていない可能性

2. **ネットワークリクエストの最適化不足**
   - 初回読み込み時にFirestoreへの接続確立に時間がかかる
   - キャッシュが効いていない可能性

## 実施した改善

### 1. Firestoreクエリの最適化
```javascript
// Before: パフォーマンスが悪い
where('status', '!=', 'cancelled')

// After: クライアント側でフィルタリング
where('date', '>=', startDate),
where('date', '<=', endDate),
orderBy('date', 'asc')
```

### 2. インデックスの設定
`firestore.indexes.json`を作成し、必要なインデックスを定義：
- date + status の複合インデックス
- customerId + date の複合インデックス
- date + time の複合インデックス

### 3. キャッシュシステムの活用
- 月間予約状況を5分間キャッシュ
- 時間枠情報を2分間キャッシュ

## 追加の最適化案

### 1. Firebaseコンソールでの作業

1. **インデックスのデプロイ**
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **エラーログの確認**
   - Firebaseコンソール → Firestore → 使用状況とルール → ログ
   - インデックスエラーがある場合は、推奨されるインデックスを作成

### 2. 初期読み込みの最適化

```javascript
// 予約ページに以下を追加
useEffect(() => {
  // Firebaseの初期接続を早める
  const preconnect = async () => {
    try {
      // ダミークエリで接続を確立
      await reservationService.getSettings()
    } catch (error) {
      console.error('Preconnect error:', error)
    }
  }
  preconnect()
}, [])
```

### 3. ローディング状態の改善

```javascript
// スケルトンローディングの実装
const CalendarSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg"></div>
  </div>
)

// Suspenseを使用
<Suspense fallback={<CalendarSkeleton />}>
  <Calendar />
</Suspense>
```

### 4. データプリフェッチ

```javascript
// 次月のデータを事前に取得
const prefetchNextMonth = async (year: number, month: number) => {
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  
  // バックグラウンドでキャッシュに保存
  reservationService.getMonthAvailability(nextYear, nextMonth)
}
```

## パフォーマンス測定

### 1. ブラウザの開発者ツール
- Network タブでFirestoreリクエストの時間を確認
- Performance タブで全体的なロード時間を測定

### 2. Firebaseのモニタリング
- Firebaseコンソール → Firestore → 使用状況
- 読み取り回数とレイテンシを確認

## 期待される改善効果

- **初回読み込み**: 2-3秒 → 1秒以下
- **2回目以降**: キャッシュにより即座に表示
- **Firestore読み取り回数**: 30回 → 1回（97%削減）

## トラブルシューティング

### インデックスエラーが続く場合
1. Firebaseコンソールのログを確認
2. 推奨されるインデックスをコピー
3. 手動でインデックスを作成

### キャッシュが効かない場合
1. Redis接続を確認
2. `REDIS_URL`環境変数を確認
3. メモリキャッシュにフォールバック

### それでも遅い場合
1. Firebaseのリージョンを確認（asia-northeast1推奨）
2. CDNを使用して静的アセットを配信
3. Service Workerでオフライン対応