const admin = require('firebase-admin');
const readline = require('readline');

// 環境変数から読み込み
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'beeart-ena',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

const auth = admin.auth();
const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  console.log('=== Firebase 管理者ユーザー作成スクリプト ===\n');
  
  // 管理者情報
  const adminEmail = 'admin@beeartena.jp';
  const adminPassword = process.env.ADMIN_PASSWORD || 'BeeArtEna2024Admin!';
  const adminName = '管理者';
  const adminPhone = '090-0000-0000';

  try {
    // 既存ユーザーの確認
    let uid;
    try {
      const existingUser = await auth.getUserByEmail(adminEmail);
      console.log(`✓ ユーザー ${adminEmail} は既に存在します`);
      uid = existingUser.uid;
      
      // パスワード更新の確認
      const answer = await new Promise((resolve) => {
        rl.question('パスワードを更新しますか？ (y/n): ', resolve);
      });
      
      if (answer.toLowerCase() === 'y') {
        await auth.updateUser(uid, { password: adminPassword });
        console.log('✓ パスワードを更新しました');
      }
    } catch (error) {
      // ユーザーが存在しない場合は新規作成
      console.log('新規管理者ユーザーを作成します...');
      const userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminName,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log('✓ 管理者ユーザーを作成しました');
    }

    // Firestoreにユーザー情報を保存/更新
    const userData = {
      id: uid,
      email: adminEmail,
      name: adminName,
      phone: adminPhone,
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      await userRef.update(userData);
      console.log('✓ Firestoreのユーザー情報を更新しました');
    } else {
      userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await userRef.set(userData);
      console.log('✓ Firestoreにユーザー情報を保存しました');
    }

    console.log('\n=== 管理者ユーザー作成完了 ===');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`UID: ${uid}`);
    console.log('\n.env.localのNEXT_PUBLIC_USE_FIREBASEをtrueに設定してください');

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    console.error('\n以下を確認してください:');
    console.error('1. Firebase Admin SDKの認証情報が正しく設定されているか');
    console.error('2. Firebaseプロジェクトが正しいか');
    console.error('3. 必要な権限があるか');
  } finally {
    rl.close();
  }
}

// 実行
createAdminUser();