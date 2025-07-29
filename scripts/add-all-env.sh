#!/bin/bash

# 残りの環境変数をpreviewとdevelopmentに追加

echo "Adding environment variables to preview and development..."

# Firebase settings
echo "beeart-ena.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview
echo "beeart-ena.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN development

echo "beeart-ena" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview
echo "beeart-ena" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID development

echo "beeart-ena.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET preview
echo "beeart-ena.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET development

echo "47862693911" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID preview
echo "47862693911" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID development

echo "1:47862693911:web:f7181ecac113393d5c9c52" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID preview
echo "1:47862693911:web:f7181ecac113393d5c9c52" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID development

echo "true" | vercel env add NEXT_PUBLIC_USE_FIREBASE preview
echo "true" | vercel env add NEXT_PUBLIC_USE_FIREBASE development

echo "beeartena-secret-key-2024-change-this-in-production" | vercel env add JWT_SECRET preview
echo "beeartena-secret-key-2024-change-this-in-production" | vercel env add JWT_SECRET development

echo "beeart-ena" | vercel env add FIREBASE_ADMIN_PROJECT_ID preview
echo "beeart-ena" | vercel env add FIREBASE_ADMIN_PROJECT_ID development

echo "All environment variables added successfully!"