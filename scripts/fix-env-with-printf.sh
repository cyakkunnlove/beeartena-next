#!/bin/bash

# Vercel環境変数を改行なしで設定するスクリプト

echo "Vercel環境変数を改行なしで修正します..."
echo ""

# 環境変数の削除と再設定
declare -a envs=(
    "NEXT_PUBLIC_FIREBASE_API_KEY|AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN|beeart-ena.firebaseapp.com"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID|beeart-ena"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET|beeart-ena.appspot.com"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|47862693911"
    "NEXT_PUBLIC_FIREBASE_APP_ID|1:47862693911:web:f7181ecac113393d5c9c52"
    "NEXT_PUBLIC_USE_FIREBASE|true"
    "FIREBASE_ADMIN_CLIENT_EMAIL|firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com"
    "FIREBASE_ADMIN_PROJECT_ID|beeart-ena"
    "JWT_SECRET|beeartena-secret-key-2024-change-this-in-production"
    "ADMIN_PASSWORD|BeeArtEna2024Admin!"
    "REDIS_KEY_PREFIX|beeartena"
    "REDIS_URL|redis://default:ASkRAAIjcDE2NDM1NGMzNDVlYjc0OTBjOTVmNGI5ZGJhNTg4MjM0MHAxMA@talented-lion-10513.upstash.io:6379"
)

for env in "${envs[@]}"; do
    IFS='|' read -r key value <<< "$env"
    echo "処理中: $key"
    
    # 既存の環境変数を削除
    vercel env rm "$key" production -y > /dev/null 2>&1
    vercel env rm "$key" preview -y > /dev/null 2>&1
    vercel env rm "$key" development -y > /dev/null 2>&1
    
    # printfを使って改行なしで追加
    printf "%s" "$value" | vercel env add "$key" production
    printf "%s" "$value" | vercel env add "$key" preview  
    printf "%s" "$value" | vercel env add "$key" development
    
    echo "✅ $key を更新しました"
    echo ""
done

echo "完了しました！"