#!/bin/bash

# Vercel環境変数の改行文字を確認するスクリプト

echo "Vercel環境変数の改行文字を確認します..."
echo ""

# 一時ファイルに環境変数をプル
vercel env pull .env.temp.check -y --environment=production > /dev/null 2>&1

# 各環境変数をチェック
echo "環境変数の改行文字チェック:"
echo "==============================="

while IFS='=' read -r key value; do
    # キーが空の場合はスキップ
    if [ -z "$key" ]; then
        continue
    fi
    
    # 改行文字を含むかチェック
    if [[ "$value" == *"\\n"* ]]; then
        echo "❌ $key: 改行文字を含んでいます"
        # 最初の50文字を表示
        preview="${value:0:50}..."
        echo "   値: $preview"
    else
        echo "✅ $key: OK"
    fi
done < .env.temp.check

# 一時ファイルを削除
rm -f .env.temp.check

echo ""
echo "チェック完了！"