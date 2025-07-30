#!/bin/bash

# Vercel環境変数設定スクリプト

echo "Vercel環境変数を設定します..."

# REDIS_URLの設定
echo "既存のRedis URLを入力してください："
read -r REDIS_URL

# REDIS_KEY_PREFIXの設定
REDIS_KEY_PREFIX="beeartena"

# 環境変数を追加
echo ""
echo "以下の環境変数を設定します："
echo "REDIS_URL: $REDIS_URL"
echo "REDIS_KEY_PREFIX: $REDIS_KEY_PREFIX"
echo ""

# 各環境に環境変数を追加
echo "Production環境に追加中..."
echo "$REDIS_URL" | vercel env add REDIS_URL production
echo "$REDIS_KEY_PREFIX" | vercel env add REDIS_KEY_PREFIX production

echo "Preview環境に追加中..."
echo "$REDIS_URL" | vercel env add REDIS_URL preview
echo "$REDIS_KEY_PREFIX" | vercel env add REDIS_KEY_PREFIX preview

echo "Development環境に追加中..."
echo "$REDIS_URL" | vercel env add REDIS_URL development
echo "$REDIS_KEY_PREFIX" | vercel env add REDIS_KEY_PREFIX development

echo ""
echo "✅ 環境変数の設定が完了しました"
echo ""
echo "次のステップ："
echo "1. ローカルの.env.localファイルを更新"
echo "2. vercel --prod でデプロイ"