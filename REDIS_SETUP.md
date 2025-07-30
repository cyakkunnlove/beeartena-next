# Redis設定ガイド

## Upstashを使用したRedis設定

### 1. Upstashアカウントの作成
1. [Upstash](https://upstash.com/)にアクセス
2. GitHubまたはGoogleアカウントでサインアップ
3. 無料プランで開始（10,000コマンド/日まで無料）

### 2. Redisデータベースの作成
1. ダッシュボードで「Create Database」をクリック
2. 以下の設定を入力：
   - **Database Name**: `beeartena-redis`
   - **Type**: `Regional`
   - **Region**: `Asia Pacific (Tokyo)` ap-northeast-1
   - **Eviction**: オフ（データを自動削除しない）

### 3. 接続情報の取得
データベース作成後、「Details」タブから以下をコピー：
- **REDIS_URL** (REST URL形式): `redis://default:xxxxx@xxxxx.upstash.io:xxxxx`

### 4. Vercel環境変数の設定

```bash
# Vercel CLIを使用
vercel env add REDIS_URL
```

または、Vercelダッシュボードから：
1. Settings → Environment Variables
2. 以下を追加：
   - Key: `REDIS_URL`
   - Value: Upstashから取得したURL
   - Environment: Production, Preview, Development

### 5. ローカル開発環境の設定

`.env.local`に追加：
```env
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
```

### 6. 動作確認

デプロイ後、以下を確認：
- Redisエラーメッセージが消える
- キャッシュ、レート制限、キューが正常に動作

## トラブルシューティング

### 接続エラーが続く場合
1. Upstashダッシュボードで「Metrics」を確認
2. 環境変数が正しく設定されているか確認
3. ファイアウォールやVPNが接続をブロックしていないか確認

### パフォーマンスの問題
- Upstashの無料プランは10,000コマンド/日まで
- 超過する場合は有料プランへのアップグレードを検討

## セキュリティ

- REDIS_URLには認証情報が含まれるため、必ず環境変数として管理
- GitHubなどのパブリックリポジトリにコミットしない
- Vercelの環境変数は暗号化されて保存される