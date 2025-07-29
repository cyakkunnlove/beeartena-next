#!/bin/bash

echo "Testing admin login..."

response=$(curl -s -X POST https://beeartena-next.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@beeartena.jp\",\"password\":\"BeeArtEna2024Admin!\"}")

echo "Response: $response"

# トークンを抽出
token=$(echo $response | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$token" ]; then
  echo "Login successful! Token: ${token:0:20}..."
  
  # /api/auth/me エンドポイントをテスト
  echo -e "\nTesting /api/auth/me..."
  curl -s https://beeartena-next.vercel.app/api/auth/me \
    -H "Authorization: Bearer $token" | jq .
else
  echo "Login failed"
fi