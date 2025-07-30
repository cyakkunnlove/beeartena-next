# Redis URLの確認方法

## 1. Upstash（最も一般的）

1. [Upstash Console](https://console.upstash.com/)にログイン
2. 使用中のデータベースをクリック
3. **Details**タブを選択
4. 以下のいずれかをコピー：
   - **REDIS_URL** (推奨): `redis://default:xxxxx@xxxxx.upstash.io:xxxxx`
   - **REST URL**: REST API用（ioredisでは使用不可）

![Upstash Dashboard]
```
Database Details
├── Endpoint: xxxxx.upstash.io:xxxxx
├── Password: xxxxx
└── REDIS_URL: redis://default:xxxxx@xxxxx.upstash.io:xxxxx ← これをコピー
```

## 2. Redis Cloud (Redis Labs)

1. [Redis Cloud Console](https://app.redislabs.com/)にログイン
2. データベースを選択
3. **Configuration**タブ
4. **Endpoint**セクションで確認：
   ```
   redis://default:パスワード@redis-xxxxx.c1.us-east-1-2.ec2.cloud.redislabs.com:xxxxx
   ```

## 3. Heroku Redis

1. Herokuダッシュボードにログイン
2. アプリを選択 → **Resources**タブ
3. Heroku Redisアドオンをクリック
4. **Settings**タブ → **View Credentials**
5. **URI**をコピー

## 4. Vercel KV (Upstashベース)

1. Vercelダッシュボード → **Storage**
2. KVストアを選択
3. **.env.local**タブ
4. `KV_URL`の値をコピー

## 5. AWS ElastiCache

ElastiCacheは直接的なRedis URLを提供しません。代わりに：
- エンドポイント: `xxxxx.cache.amazonaws.com`
- ポート: `6379`
- URL形式: `redis://xxxxx.cache.amazonaws.com:6379`

## 既存のアプリから確認する方法

### Vercelの既存プロジェクトから
```bash
# Vercel CLIでログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を確認
vercel env pull .env.temp

# .env.tempファイルを開いてREDIS_URLを確認
cat .env.temp | grep REDIS_URL
```

### Herokuアプリから
```bash
heroku config:get REDIS_URL -a your-app-name
```

### ローカルの.envファイルから
```bash
# 他のプロジェクトの.envファイルを確認
cat ~/path/to/other/project/.env | grep REDIS_URL
```

## 確認時の注意点

1. **機密情報の扱い**
   - Redis URLにはパスワードが含まれます
   - 公開リポジトリにコミットしない
   - 必ず環境変数として管理

2. **URLフォーマット**
   - 標準形式: `redis://[ユーザー名]:パスワード@ホスト:ポート/[データベース番号]`
   - Upstashの場合: `redis://default:パスワード@ホスト.upstash.io:ポート`

3. **接続テスト**
   ```bash
   # Redis CLIでテスト（redis-cliがインストールされている場合）
   redis-cli -u "redis://default:xxxxx@xxxxx.upstash.io:xxxxx" ping
   ```

## 次のステップ

Redis URLを確認したら：
1. `.env.local`の`YOUR_REDIS_URL_HERE`を実際のURLに置き換え
2. Vercel環境変数に追加
3. デプロイしてテスト