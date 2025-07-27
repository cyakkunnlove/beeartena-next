#!/bin/bash

# Firebase Setup Script for Bee Artena
# このスクリプトはFirebaseプロジェクトを自動的にセットアップします

echo "🐝 Bee Artena - Firebase セットアップスクリプト"
echo "============================================="
echo ""

# Firebase CLIがインストールされているか確認
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLIがインストールされていません"
    echo "インストールしますか？ (y/n)"
    read -r install_firebase
    
    if [ "$install_firebase" = "y" ]; then
        echo "📦 Firebase CLIをインストール中..."
        npm install -g firebase-tools
    else
        echo "Firebase CLIをインストールしてから再度実行してください："
        echo "npm install -g firebase-tools"
        exit 1
    fi
fi

# Firebaseにログイン
echo "🔐 Firebaseにログインします..."
firebase login

# プロジェクトの作成または選択
echo ""
echo "📝 Firebaseプロジェクトの設定"
echo "1) 新しいプロジェクトを作成"
echo "2) 既存のプロジェクトを使用"
read -p "選択してください (1/2): " project_choice

if [ "$project_choice" = "1" ]; then
    read -p "プロジェクトID (例: beeartena-prod): " PROJECT_ID
    read -p "プロジェクト名 (例: Bee Artena): " PROJECT_NAME
    
    echo "📱 新しいFirebaseプロジェクトを作成中..."
    firebase projects:create "$PROJECT_ID" --display-name "$PROJECT_NAME"
    
    # プロジェクトを選択
    firebase use "$PROJECT_ID"
else
    echo "既存のプロジェクト一覧："
    firebase projects:list
    read -p "プロジェクトIDを入力してください: " PROJECT_ID
    firebase use "$PROJECT_ID"
fi

# Firebaseの初期化
echo ""
echo "🚀 Firebaseサービスを初期化中..."

# firebase.json を作成
cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF

# firestore.indexes.json を作成
cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "reservations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "reservations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "date",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "points",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF

# Firestoreを有効化
echo ""
echo "🗄️ Firestoreを有効化中..."
firebase firestore:databases:create default --location asia-northeast1

# 認証を有効化
echo ""
echo "🔐 認証を設定中..."
echo "Firebaseコンソールで以下を有効化してください："
echo "1. メール/パスワード認証"
echo "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo ""
read -p "設定が完了したらEnterを押してください..."

# Webアプリを追加
echo ""
echo "🌐 Webアプリを追加中..."
read -p "アプリ名 (例: Bee Artena Web): " APP_NAME

# Firebase設定を取得
firebase apps:create web "$APP_NAME" --json > firebase-config.json

# 設定情報を抽出
echo ""
echo "📋 Firebase設定情報を取得中..."

# Node.jsスクリプトで設定を抽出
cat > extract-config.js << 'EOF'
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase-config.json', 'utf8'));

const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${config.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${config.authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${config.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${config.storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${config.appId}

# JWT Secret (変更してください)
JWT_SECRET=your-secret-jwt-key-please-change-in-production

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ .env.local ファイルが作成されました');
EOF

node extract-config.js
rm extract-config.js
rm firebase-config.json

# セキュリティルールをデプロイ
echo ""
echo "🔒 セキュリティルールをデプロイ中..."
firebase deploy --only firestore:rules

# 初期データの作成
echo ""
echo "📊 初期データを作成しますか？ (y/n)"
read -r create_initial_data

if [ "$create_initial_data" = "y" ]; then
    cat > init-data.js << 'EOF'
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

admin.initializeApp();
const db = admin.firestore();

async function createInitialData() {
  try {
    // 管理者ユーザーを作成
    const adminUser = {
      id: 'admin-1',
      email: 'admin@beeartena.jp',
      name: '管理者',
      phone: '090-0000-0000',
      role: 'admin',
      points: 0,
      createdAt: new Date()
    };
    
    await db.collection('users').doc(adminUser.id).set(adminUser);
    console.log('✅ 管理者ユーザーを作成しました');
    
    // サービスマスタを作成
    const services = [
      { id: '2D', name: 'パウダーブロウ', price: 20000, duration: 120 },
      { id: '3D', name: 'フェザーブロウ', price: 20000, duration: 120 },
      { id: '4D', name: 'パウダー&フェザー', price: 25000, duration: 120 }
    ];
    
    for (const service of services) {
      await db.collection('services').doc(service.id).set(service);
    }
    console.log('✅ サービスマスタを作成しました');
    
  } catch (error) {
    console.error('エラー:', error);
  }
  process.exit();
}

createInitialData();
EOF

    echo "初期データを作成中..."
    npm install firebase-admin bcryptjs
    node init-data.js
    rm init-data.js
fi

# Vercel用の環境変数を表示
echo ""
echo "============================================="
echo "✅ Firebaseのセットアップが完了しました！"
echo "============================================="
echo ""
echo "📝 Vercelに以下の環境変数を設定してください："
echo ""
cat .env.local | grep -v "^#" | grep -v "^$" | while read line; do
    echo "  $line"
done
echo ""
echo "🚀 開発サーバーを起動："
echo "  npm run dev"
echo ""
echo "🌐 本番環境へのデプロイ："
echo "  vercel"
echo ""
echo "⚠️  重要："
echo "  - JWT_SECRETは必ず変更してください"
echo "  - Firebase Authenticationでメール/パスワード認証を有効化してください"
echo "  - 管理者パスワードは Firebase Authentication で設定してください"
echo ""