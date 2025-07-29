#!/bin/bash

# Vercel環境変数設定スクリプト

echo "Setting Vercel environment variables..."

# Firebase Configuration
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production < <(echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA")
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production < <(echo "beeart-ena.firebaseapp.com")
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production < <(echo "beeart-ena")
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production < <(echo "beeart-ena.appspot.com")
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production < <(echo "47862693911")
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production < <(echo "1:47862693911:web:f7181ecac113393d5c9c52")

# Other settings
vercel env add NEXT_PUBLIC_USE_FIREBASE production < <(echo "true")
vercel env add JWT_SECRET production < <(echo "beeartena-secret-key-2024-change-this-in-production")
vercel env add FIREBASE_ADMIN_PROJECT_ID production < <(echo "beeart-ena")

# Also add to preview and development environments
echo "Adding to preview and development environments..."

# Firebase Configuration for preview/development
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY preview development < <(echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA")
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview development < <(echo "beeart-ena.firebaseapp.com")
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview development < <(echo "beeart-ena")
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET preview development < <(echo "beeart-ena.appspot.com")
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID preview development < <(echo "47862693911")
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID preview development < <(echo "1:47862693911:web:f7181ecac113393d5c9c52")

# Other settings for preview/development
vercel env add NEXT_PUBLIC_USE_FIREBASE preview development < <(echo "true")
vercel env add JWT_SECRET preview development < <(echo "beeartena-secret-key-2024-change-this-in-production")
vercel env add FIREBASE_ADMIN_PROJECT_ID preview development < <(echo "beeart-ena")

echo "Environment variables set successfully!"
echo "Now run: vercel --prod to deploy with new environment variables"