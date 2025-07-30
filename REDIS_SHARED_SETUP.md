# 既存のRedisインスタンスを共有する設定

## 方法1: 既存のRedisを共有（推奨）

### 手順

1. **既存のRedis URLを取得**
   - 他のアプリで使用しているREDIS_URLをコピー

2. **Vercel環境変数に追加**
   ```bash
   # Vercelダッシュボードから設定
   REDIS_URL=<既存のRedis URL>
   REDIS_KEY_PREFIX=beeartena
   ```

3. **ローカル環境設定**
   `.env.local`に追加：
   ```env
   REDIS_URL=<既存のRedis URL>
   REDIS_KEY_PREFIX=beeartena
   ```

### 利点
- 追加コストなし
- 管理が簡単
- プレフィックスによりデータの衝突を防止

### 注意点
- 両方のアプリケーションで使用量が増える
- Upstashの無料プランは10,000コマンド/日まで

## 方法2: 新しいRedisインスタンスを作成

もし既存のRedisを共有したくない場合：

1. **Upstashで新規データベース作成**
   - 別のデータベースを作成
   - 独立した接続URL

2. **独立した管理**
   - アプリケーション間で完全に分離
   - それぞれの使用量を個別に管理

## 推奨設定

既存のRedisを使用する場合の環境変数：

```bash
# 必須
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
REDIS_KEY_PREFIX=beeartena

# オプション（デバッグ用）
DISABLE_REDIS=false
```

## デプロイ手順

1. Vercelダッシュボードで環境変数設定
2. デプロイ実行：
   ```bash
   vercel --prod
   ```

## 確認方法

デプロイ後、以下を確認：
- Redisエラーが消えている
- キャッシュが正常に動作
- 他のアプリケーションに影響がない