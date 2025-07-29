#!/bin/bash

echo "=== Firebase CLI で管理者ユーザーを作成 ==="
echo ""

# プロジェクトIDを設定
PROJECT_ID="beeart-ena"
ADMIN_EMAIL="admin@beeartena.jp"
ADMIN_PASSWORD="BeeArtEna2024Admin!"

# 現在のプロジェクトを確認
echo "1. 現在のFirebaseプロジェクトを確認..."
firebase use $PROJECT_ID || {
    echo "プロジェクトを設定中..."
    firebase use --add $PROJECT_ID
}

echo ""
echo "2. 管理者ユーザーを作成..."
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo ""

# Firebase CLIでユーザーを作成（エミュレータを使わずに本番に作成）
cat > create-admin-user.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser() {
  const adminEmail = 'admin@beeartena.jp';
  const adminPassword = 'BeeArtEna2024Admin!';
  
  try {
    // ユーザーを作成または更新
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
      console.log('既存のユーザーが見つかりました:', userRecord.uid);
      // パスワードを更新
      await admin.auth().updateUser(userRecord.uid, {
        password: adminPassword,
        emailVerified: true
      });
      console.log('パスワードを更新しました');
    } catch (error) {
      // ユーザーが存在しない場合は作成
      userRecord = await admin.auth().createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: '管理者',
        emailVerified: true
      });
      console.log('新規ユーザーを作成しました:', userRecord.uid);
    }
    
    // Firestoreに管理者情報を設定
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: adminEmail,
      name: '管理者',
      phone: '090-0000-0000',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('Firestoreに管理者情報を保存しました');
    console.log('\n✅ 管理者ユーザーの作成が完了しました！');
    console.log('UID:', userRecord.uid);
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  process.exit(0);
}

createAdminUser();
EOF

# サービスアカウントキーの確認
if [ ! -f "service-account-key.json" ]; then
    echo ""
    echo "⚠️  サービスアカウントキーが見つかりません"
    echo ""
    echo "以下の手順でサービスアカウントキーを取得してください："
    echo "1. https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    echo "2. 「新しい秘密鍵の生成」をクリック"
    echo "3. ダウンロードしたJSONファイルを 'service-account-key.json' として保存"
    echo "4. このスクリプトを再実行"
    echo ""
    
    # クリーンアップ
    rm -f create-admin-user.js
    exit 1
fi

# Node.jsスクリプトを実行
echo "管理者ユーザーを作成中..."
node create-admin-user.js

# クリーンアップ
rm -f create-admin-user.js

echo ""
echo "次のステップ："
echo "1. .env.local で NEXT_PUBLIC_USE_FIREBASE=true に設定"
echo "2. npm run dev で開発サーバーを再起動"
echo "3. http://localhost:3000/login でログイン"