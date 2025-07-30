# Vercel CLIでRedis環境変数を設定する方法

## 方法1: echoコマンドを使用（推奨）

```bash
# REDIS_URLを設定（既存のRedis URLに置き換えてください）
echo "redis://default:xxxxx@xxxxx.upstash.io:xxxxx" | vercel env add REDIS_URL production
echo "redis://default:xxxxx@xxxxx.upstash.io:xxxxx" | vercel env add REDIS_URL preview
echo "redis://default:xxxxx@xxxxx.upstash.io:xxxxx" | vercel env add REDIS_URL development

# REDIS_KEY_PREFIXを設定
echo "beeartena" | vercel env add REDIS_KEY_PREFIX production
echo "beeartena" | vercel env add REDIS_KEY_PREFIX preview
echo "beeartena" | vercel env add REDIS_KEY_PREFIX development
```

## 方法2: ファイルから読み込む

1. 環境変数ファイルを作成：
```bash
# .env.vercel を作成
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
REDIS_KEY_PREFIX=beeartena
```

2. ファイルから環境変数を追加：
```bash
# REDIS_URL
grep REDIS_URL .env.vercel | cut -d'=' -f2 | vercel env add REDIS_URL production
grep REDIS_URL .env.vercel | cut -d'=' -f2 | vercel env add REDIS_URL preview
grep REDIS_URL .env.vercel | cut -d'=' -f2 | vercel env add REDIS_URL development

# REDIS_KEY_PREFIX
grep REDIS_KEY_PREFIX .env.vercel | cut -d'=' -f2 | vercel env add REDIS_KEY_PREFIX production
grep REDIS_KEY_PREFIX .env.vercel | cut -d'=' -f2 | vercel env add REDIS_KEY_PREFIX preview
grep REDIS_KEY_PREFIX .env.vercel | cut -d'=' -f2 | vercel env add REDIS_KEY_PREFIX development
```

## 方法3: 一括設定（macOS/Linux）

```bash
# 環境変数を定義
REDIS_URL="redis://default:xxxxx@xxxxx.upstash.io:xxxxx"
REDIS_KEY_PREFIX="beeartena"

# 全環境に一括追加
for env in production preview development; do
  echo "$REDIS_URL" | vercel env add REDIS_URL $env
  echo "$REDIS_KEY_PREFIX" | vercel env add REDIS_KEY_PREFIX $env
done
```

## 設定確認

```bash
# 環境変数の一覧を確認
vercel env ls

# 特定の環境変数を確認
vercel env ls REDIS_URL
vercel env ls REDIS_KEY_PREFIX
```

## ローカル環境の設定

`.env.local`に追加：
```env
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:xxxxx
REDIS_KEY_PREFIX=beeartena
```

## デプロイ

```bash
# 本番環境にデプロイ
vercel --prod
```

## トラブルシューティング

### 環境変数が既に存在する場合
```bash
# 既存の環境変数を削除
vercel env rm REDIS_URL
vercel env rm REDIS_KEY_PREFIX

# 再度追加
```

### 環境変数の値を更新する場合
環境変数は上書きできないため、一度削除してから再追加する必要があります。