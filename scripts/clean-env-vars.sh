#!/bin/bash

echo "Cleaning all Firebase environment variables..."

# Remove each variable from all environments
ENV_VARS=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" 
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
  "NEXT_PUBLIC_USE_FIREBASE"
)

for var in "${ENV_VARS[@]}"; do
  echo "Removing $var from all environments..."
  # Remove from production
  yes | vercel env rm "$var" production || true
  # Remove from preview  
  yes | vercel env rm "$var" preview || true
  # Remove from development
  yes | vercel env rm "$var" development || true
done

echo "All variables removed. Now setting them correctly..."

# Set correct values one by one
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA"
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY preview <<< "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA"
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY development <<< "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA"

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "beeart-ena.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview <<< "beeart-ena.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN development <<< "beeart-ena.firebaseapp.com"

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "beeart-ena"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID preview <<< "beeart-ena"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID development <<< "beeart-ena"

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "beeart-ena.appspot.com"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET preview <<< "beeart-ena.appspot.com"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET development <<< "beeart-ena.appspot.com"

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production <<< "47862693911"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID preview <<< "47862693911"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID development <<< "47862693911"

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "1:47862693911:web:f7181ecac113393d5c9c52"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID preview <<< "1:47862693911:web:f7181ecac113393d5c9c52"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID development <<< "1:47862693911:web:f7181ecac113393d5c9c52"

vercel env add NEXT_PUBLIC_USE_FIREBASE production <<< "true"
vercel env add NEXT_PUBLIC_USE_FIREBASE preview <<< "true"
vercel env add NEXT_PUBLIC_USE_FIREBASE development <<< "true"

echo "Environment variables have been reset successfully!"
echo "Run 'vercel --prod' to deploy with the corrected variables."