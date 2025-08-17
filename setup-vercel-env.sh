#!/bin/bash

echo "Vercel環境変数を設定します..."

# Firebase設定（クライアントサイド）
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "beeart-ena.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "beeart-ena"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "beeart-ena.firebasestorage.app"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production <<< "47862693911"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "1:47862693911:web:f7181ecac113393d5c9c52"

# Firebase Admin SDK（サーバーサイド）
vercel env add FIREBASE_ADMIN_PROJECT_ID production <<< "beeart-ena"
vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production <<< "firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com"

# Private Keyは特殊文字が含まれるため、ファイルから読み込む
echo '-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzj6EhPr02ypFS
GTVdFdNzENd3cT5Jal9TO/6FRs09axSbjCRkjnIYafIEc6z01HMcMVT0XIShEG3f
aUrcwDY9HJplhV8+nM9qvCFLjce8UZBk2+Okp+dztgchkZhm8t+vCJT477QHM+J2
s/g233s2rdBgTDAkZdSx7cE7lSL5uW+6GUvaPoxtAesMndOtOZ9H64qMElwb4Am3
SK/XeMGxN/uyM1KwbThZ/izeexyghCVkIQkEvn4inFl2wNjyQkXQaMQfmd8gjzAf
ramBafM/uGCCtevBaYxeFGwEiHcNmFsrr8n1++vKRvbC/5Z+ZXPkbzxkFGetV0Sx
vxVXEDmtAgMBAAECggEAFVmoJoxPskKeydy+eB1+wWlIvWaFKfSQdhSlnFJBWCKx
1hbxQtWfImECil34vDnAoCMLf2y6xm3uKojaAmqGaHjMsPKNUyQRE5df/BxVGgK2
wQ9WP39JaXxE18x4ixEo4KaMFBdoWAzmygd3JYsoGuXK55BXjxRemHN1LPD8MiYT
jMlwB0QnWzRrWCQtN0FmayE5WAEQ0Jm62WFizPATfmFbuFA7pnEhM1Xy7zkDPKbF
GLrwHv1zN5+oyIcjQ5Su23+qAyenwJGeTHaoTSSQTPYKUmK9BnqB+chlFOa53ahU
4WSiwbOSXvEDVPEiKjrPob8A4kaIRX7Srx8BVRfu8QKBgQDy8TYhmT0g1pSuWjNF
a8QOf6zUJMA86LDSSJTkkwfkQRFJltvoG69GcK/TtICtz+r3vQDBzAfCOX3eZBqI
kOaLMer02CKcCcaur9mF1d7vYU+ukMvNaulqf017wGWc8rQurltJYcmoEkMSrIM3
/zFwvu05LQcQAYaVX40MpKNh2QKBgQC9NlFwb40N2UnBVdacZphAbMvlMaS3zxUm
aVLCZy+fev9JTY61Jki1Itdymi+0MW4ApTxnjOUdSCXXud6UffD+mb5dG42z/orp
it4NTetB1+0Hzm6pybY1V4uxuPK3AaNSjspasHihoEiK+l2VTHbBgZJJWFm42MUq
DvDjyM4d9QKBgQDh3jdIp5L4q+gR7dTLTzU5kaSanAyK1IBJEag0lyp4IbKz62lK
9CpSYERonOIiNzOq3vMMOuhfwFnw4Lr2i1l8wo1C1Ivg7QnmsaGYV85sWtndX8vL
kQGwvOjKDIesks3ItNw0bpExDMGFZBSfhEhwHWKqjN2LGRAKYord3Vf1iQKBgBVD
dnGBR8PHqH8+q0iWSwPqdhuCsbUqY4EWkwNf3z038FqHicMX01Hv4XBynWvNpkQS
TbCBZ/obco1EyRu874ldM8R45TrWHzxRq9So7ghPQMcAzvTrwztJZFyLoVMprvYH
L/xzGotnXN+pdTzjA/GJIyx07lhUnAu29CFVHrzFAoGBAN+8P0ekY3XkWf1f4DEN
kF3kfwddp7QLSV/mP2aEBA/ZFxYn854KFuann5ihK6WXsp/nsZCRcqfMvL/opAY+
hOvKiT6bUVAYmIzJXCgyyBGGkOMLWJvZe4GxO4STZJCfydpyYm453FF1ft4Ipd9w
40CbAhVt25H4jqqYiib54dnq
-----END PRIVATE KEY-----' | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production

# 認証設定
vercel env add JWT_SECRET production <<< "beeartena-secret-key-2024-change-this-in-production"
vercel env add ADMIN_PASSWORD production <<< "BeeArtEna2024Admin!"

# その他の設定
vercel env add NEXT_PUBLIC_USE_FIREBASE production <<< "true"
vercel env add NODE_ENV production <<< "production"
vercel env add NEXT_PUBLIC_API_URL production <<< ""

# Redis設定（オプション）
vercel env add REDIS_URL production <<< "redis://default:ASkRAAIjcDE2NDM1NGMzNDVlYjc0OTBjOTVmNGI5ZGJhNTg4MjM0MHAxMA@talented-lion-10513.upstash.io:6379"
vercel env add REDIS_KEY_PREFIX production <<< "beeartena"

echo "環境変数の設定が完了しました！"
echo "再デプロイを実行します..."
vercel --prod