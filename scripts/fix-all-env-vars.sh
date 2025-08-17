#!/bin/bash

# Vercel環境変数を修正するスクリプト

echo "Vercel環境変数の修正を開始します..."

# 環境変数と値のペア
declare -A envVars=(
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"]="beeart-ena.firebaseapp.com"
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]="beeart-ena"
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"]="beeart-ena.appspot.com"
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"]="47862693911"
    ["NEXT_PUBLIC_FIREBASE_APP_ID"]="1:47862693911:web:f7181ecac113393d5c9c52"
    ["NEXT_PUBLIC_USE_FIREBASE"]="true"
    ["FIREBASE_ADMIN_PROJECT_ID"]="beeart-ena"
    ["FIREBASE_ADMIN_CLIENT_EMAIL"]="firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com"
    ["JWT_SECRET"]="beeartena-secret-key-2024-change-this-in-production"
    ["ADMIN_PASSWORD"]="BeeArtEna2024Admin!"
    ["REDIS_KEY_PREFIX"]="beeartena"
    ["REDIS_URL"]="redis://default:ASkRAAIjcDE2NDM1NGMzNDVlYjc0OTBjOTVmNGI5ZGJhNTg4MjM0MHAxMA@talented-lion-10513.upstash.io:6379"
)

# 各環境変数を処理
for key in "${!envVars[@]}"; do
    echo ""
    echo "処理中: $key"
    
    # 既存の環境変数を削除
    vercel env rm "$key" production -y 2>/dev/null
    vercel env rm "$key" preview -y 2>/dev/null
    vercel env rm "$key" development -y 2>/dev/null
    
    # 新しい値で追加
    echo "${envVars[$key]}" | vercel env add "$key" production
    echo "${envVars[$key]}" | vercel env add "$key" preview
    echo "${envVars[$key]}" | vercel env add "$key" development
    
    echo "✅ $key を更新しました"
done

echo ""
echo "⚠️  注意: FIREBASE_ADMIN_PRIVATE_KEY は複数行のため、手動で設定する必要があります"
echo ""
echo "完了しました！次のステップ:"
echo "1. vercel --prod で再デプロイ"
echo "2. 5-10分待つ"
echo "3. https://beeartena-next.vercel.app/debug/firebase-auth でテスト"