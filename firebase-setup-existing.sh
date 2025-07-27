#!/bin/bash

# Firebase Setup Script for Bee Artena - 既存プロジェクト用
# このスクリプトは既存のFirebaseプロジェクト「BEEART ENA」を使用します

echo "🐝 Bee Artena - Firebase セットアップスクリプト"
echo "============================================="
echo "既存のプロジェクト「BEEART ENA」を使用します"
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

# 既存プロジェクトの一覧を表示
echo ""
echo "📝 利用可能なFirebaseプロジェクト一覧："
firebase projects:list

echo ""
echo "🎯 「BEEART ENA」プロジェクトを使用します"
read -p "プロジェクトID（例: beeartena, beeart-ena など）を入力してください: " PROJECT_ID

# プロジェクトを選択
firebase use "$PROJECT_ID"

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

# Firestoreが有効かチェック
echo ""
echo "🗄️ Firestoreの状態を確認中..."
echo "Firestoreが有効でない場合は、Firebase Consoleで有効化してください："
echo "https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo ""
read -p "Firestoreが有効になっていることを確認したらEnterを押してください..."

# 既存のWebアプリを確認
echo ""
echo "🌐 既存のWebアプリを確認中..."
firebase apps:list

echo ""
echo "既存のWebアプリがありますか？ (y/n)"
read -r has_web_app

if [ "$has_web_app" = "n" ]; then
    read -p "新しいWebアプリ名 (例: Bee Artena Web): " APP_NAME
    firebase apps:create web "$APP_NAME"
fi

# Firebase設定を取得
echo ""
echo "📋 Firebase設定情報を取得中..."
echo "Firebase Consoleから設定を取得します："
echo "https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo ""
echo "ウェブアプリの設定（firebaseConfig）をコピーしてください"
echo ""

# 手動で設定を入力
echo "Firebase設定を入力してください："
read -p "API Key: " API_KEY
read -p "Auth Domain: " AUTH_DOMAIN
read -p "Project ID (自動入力: $PROJECT_ID): " INPUT_PROJECT_ID
PROJECT_ID=${INPUT_PROJECT_ID:-$PROJECT_ID}
read -p "Storage Bucket: " STORAGE_BUCKET
read -p "Messaging Sender ID: " MESSAGING_SENDER_ID
read -p "App ID: " APP_ID

# .env.localファイルを作成
cat > .env.local << EOF
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$APP_ID

# JWT Secret (変更してください)
JWT_SECRET=your-secret-jwt-key-please-change-in-production

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

echo "✅ .env.local ファイルが作成されました"

# 認証の確認
echo ""
echo "🔐 認証設定を確認してください："
echo "1. Firebase Consoleで Authentication → Sign-in method"
echo "2. メール/パスワード認証が有効になっていることを確認"
echo "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo ""
read -p "設定が完了したらEnterを押してください..."

# セキュリティルールをデプロイ
echo ""
echo "🔒 セキュリティルールをデプロイしますか？ (y/n)"
read -r deploy_rules

if [ "$deploy_rules" = "y" ]; then
    echo "セキュリティルールをデプロイ中..."
    firebase deploy --only firestore:rules
fi

# 初期データの確認
echo ""
echo "📊 初期データを作成しますか？ (y/n)"
echo "※ 既存のデータがある場合はスキップしてください"
read -r create_initial_data

if [ "$create_initial_data" = "y" ]; then
    # Firebase Admin SDKのセットアップ
    echo ""
    echo "⚠️  初期データの作成にはサービスアカウントキーが必要です"
    echo "1. Firebase Console → プロジェクトの設定 → サービスアカウント"
    echo "2. 「新しい秘密鍵を生成」をクリック"
    echo "3. ダウンロードしたJSONファイルを serviceAccountKey.json として保存"
    echo "https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    echo ""
    read -p "serviceAccountKey.json を配置したらEnterを押してください..."
    
    if [ -f "serviceAccountKey.json" ]; then
        cat > init-data.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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
        npm install firebase-admin
        node init-data.js
        rm init-data.js
        
        # セキュリティのためサービスアカウントキーを削除
        echo ""
        echo "⚠️  セキュリティのため serviceAccountKey.json を削除します"
        rm serviceAccountKey.json
    else
        echo "❌ serviceAccountKey.json が見つかりません"
    fi
fi

# .gitignoreに追加
echo ""
echo "📝 .gitignoreを更新中..."
if ! grep -q "serviceAccountKey.json" .gitignore 2>/dev/null; then
    echo "serviceAccountKey.json" >> .gitignore
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
echo "  - serviceAccountKey.json は絶対にGitにコミットしないでください"
echo ""