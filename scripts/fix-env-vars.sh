#!/bin/bash

echo "Fixing environment variables with newline issues..."

# 削除する環境変数のリスト
ENV_VARS=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
  "NEXT_PUBLIC_USE_FIREBASE"
  "JWT_SECRET"
  "FIREBASE_ADMIN_PROJECT_ID"
)

# 各環境変数を削除
for var in "${ENV_VARS[@]}"; do
  echo "Removing $var..."
  echo -e "y\ny\ny" | vercel env rm "$var" 2>/dev/null || true
done

echo "All environment variables removed. Now re-adding them correctly..."

# 正しい値で再設定
echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY preview
echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY development

echo "beeart-ena.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
echo "beeart-ena.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview
echo "beeart-ena.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN development

echo "beeart-ena" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
echo "beeart-ena" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview
echo "beeart-ena" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID development

echo "beeart-ena.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
echo "beeart-ena.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET preview
echo "beeart-ena.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET development

echo "47862693911" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
echo "47862693911" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID preview
echo "47862693911" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID development

echo "1:47862693911:web:f7181ecac113393d5c9c52" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
echo "1:47862693911:web:f7181ecac113393d5c9c52" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID preview
echo "1:47862693911:web:f7181ecac113393d5c9c52" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID development

echo "true" | vercel env add NEXT_PUBLIC_USE_FIREBASE production
echo "true" | vercel env add NEXT_PUBLIC_USE_FIREBASE preview
echo "true" | vercel env add NEXT_PUBLIC_USE_FIREBASE development

echo "beeartena-secret-key-2024-change-this-in-production" | vercel env add JWT_SECRET production
echo "beeartena-secret-key-2024-change-this-in-production" | vercel env add JWT_SECRET preview
echo "beeartena-secret-key-2024-change-this-in-production" | vercel env add JWT_SECRET development

echo "beeart-ena" | vercel env add FIREBASE_ADMIN_PROJECT_ID production
echo "beeart-ena" | vercel env add FIREBASE_ADMIN_PROJECT_ID preview
echo "beeart-ena" | vercel env add FIREBASE_ADMIN_PROJECT_ID development

echo "Environment variables fixed successfully!"