#!/bin/bash

# Vercel環境変数から改行文字を削除するスクリプト

echo "Vercel環境変数の改行文字を修正します..."
echo ""

# 修正が必要な環境変数のリスト
envVars=(
    "ADMIN_PASSWORD"
    "FIREBASE_ADMIN_CLIENT_EMAIL"
    "FIREBASE_ADMIN_PROJECT_ID"
    "JWT_SECRET"
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_APP_ID"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "NEXT_PUBLIC_USE_FIREBASE"
    "REDIS_KEY_PREFIX"
    "REDIS_URL"
)

# 環境変数の値
declare -A envValues=(
    ["ADMIN_PASSWORD"]="BeeArtEna2024Admin!"
    ["FIREBASE_ADMIN_CLIENT_EMAIL"]="firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com"
    ["FIREBASE_ADMIN_PROJECT_ID"]="beeart-ena"
    ["JWT_SECRET"]="beeartena-secret-key-2024-change-this-in-production"
    ["NEXT_PUBLIC_FIREBASE_API_KEY"]="AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA"
    ["NEXT_PUBLIC_FIREBASE_APP_ID"]="1:47862693911:web:f7181ecac113393d5c9c52"
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"]="beeart-ena.firebaseapp.com"
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"]="47862693911"
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]="beeart-ena"
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"]="beeart-ena.appspot.com"
    ["NEXT_PUBLIC_USE_FIREBASE"]="true"
    ["REDIS_KEY_PREFIX"]="beeartena"
    ["REDIS_URL"]="redis://default:ASkRAAIjcDE2NDM1NGMzNDVlYjc0OTBjOTVmNGI5ZGJhNTg4MjM0MHAxMA@talented-lion-10513.upstash.io:6379"
)

# 各環境変数を処理
for key in "${envVars[@]}"; do
    echo "処理中: $key"
    
    # 既存の環境変数を削除
    vercel env rm "$key" production -y > /dev/null 2>&1
    vercel env rm "$key" preview -y > /dev/null 2>&1
    vercel env rm "$key" development -y > /dev/null 2>&1
    
    # 新しい値で追加
    echo "${envValues[$key]}" | vercel env add "$key" production
    echo "${envValues[$key]}" | vercel env add "$key" preview  
    echo "${envValues[$key]}" | vercel env add "$key" development
    
    echo "✅ $key を更新しました"
    echo ""
done

echo ""
echo "⚠️  注意: FIREBASE_ADMIN_PRIVATE_KEY は複数行のため、手動で設定が必要です"
echo ""
echo "完了しました！次のステップ:"
echo "1. vercel --prod で再デプロイ"
echo "2. 5-10分待つ"
echo "3. https://beeartena-next.vercel.app/debug/firebase-auth でテスト"