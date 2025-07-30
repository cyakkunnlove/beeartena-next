const admin = require('firebase-admin');

// 環境変数の確認
console.log('=== Firebase環境変数チェック ===');
console.log('FIREBASE_ADMIN_PROJECT_ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? '設定済み' : '未設定');
console.log('FIREBASE_ADMIN_CLIENT_EMAIL:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? '設定済み' : '未設定');
console.log('FIREBASE_ADMIN_PRIVATE_KEY:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? '設定済み' : '未設定');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '設定済み' : '未設定');
console.log('');

// Firebase Admin SDK の初期化
try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey) {
      console.error('エラー: FIREBASE_ADMIN_PRIVATE_KEY が設定されていません');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('✅ Firebase Admin SDK 初期化成功');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK 初期化エラー:', error.message);
  process.exit(1);
}

// テストユーザーの作成を試みる
async function testRegistration() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('\n=== テストユーザー登録 ===');
  console.log('Email:', testEmail);
  
  try {
    // Firebase Admin SDK でユーザー作成
    const userRecord = await admin.auth().createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Test User',
    });
    
    console.log('✅ ユーザー作成成功:', userRecord.uid);
    
    // Firestore にユーザー情報を保存
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: testEmail,
      name: 'Test User',
      phone: '090-0000-0000',
      role: 'customer',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Firestore へのユーザー情報保存成功');
    
    // 作成したユーザーを削除（クリーンアップ）
    await admin.auth().deleteUser(userRecord.uid);
    await db.collection('users').doc(userRecord.uid).delete();
    console.log('✅ テストユーザーのクリーンアップ完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    
    if (error.code === 'auth/project-not-found') {
      console.error('\n⚠️  Firebase プロジェクトが見つかりません。環境変数を確認してください。');
    } else if (error.code === 'auth/invalid-credential') {
      console.error('\n⚠️  認証情報が無効です。サービスアカウントキーを確認してください。');
    }
  }
}

// Firebase Authentication の設定確認
async function checkAuthSettings() {
  console.log('\n=== Firebase Authentication 設定確認 ===');
  
  try {
    // プロジェクトの設定を確認
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    console.log('プロジェクトID:', projectId);
    
    // 既存のユーザー数を確認
    const listUsersResult = await admin.auth().listUsers(10);
    console.log('既存ユーザー数:', listUsersResult.users.length);
    
  } catch (error) {
    console.error('❌ 設定確認エラー:', error.message);
  }
}

// メイン実行
async function main() {
  try {
    await checkAuthSettings();
    await testRegistration();
    console.log('\n✅ すべてのテストが完了しました');
  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error);
  } finally {
    process.exit(0);
  }
}

main();