// 簡易版：Firebase Consoleで作成した管理者ユーザーのroleを設定するスクリプト
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase設定（.env.localと同じ）
const firebaseConfig = {
  apiKey: "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA",
  authDomain: "beeart-ena.firebaseapp.com",
  projectId: "beeart-ena",
  storageBucket: "beeart-ena.appspot.com",
  messagingSenderId: "47862693911",
  appId: "1:47862693911:web:f7181ecac113393d5c9c52"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdminUser() {
  console.log('=== Firebase 管理者ユーザー設定 ===\n');
  console.log('前提条件:');
  console.log('1. Firebase Consoleで admin@beeartena.jp を作成済み');
  console.log('2. パスワード: BeeArtEna2024Admin!\n');

  const adminEmail = 'admin@beeartena.jp';
  const adminPassword = 'BeeArtEna2024Admin!';

  try {
    // ログイン
    console.log('管理者アカウントでログイン中...');
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    console.log('✓ ログイン成功');
    console.log('UID:', user.uid);

    // Firestoreにユーザー情報を保存
    console.log('\nFirestoreにユーザー情報を保存中...');
    const userData = {
      id: user.uid,
      email: adminEmail,
      name: '管理者',
      phone: '090-0000-0000',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('✓ Firestoreに管理者情報を保存しました');

    console.log('\n=== 設定完了 ===');
    console.log('管理者ユーザーの準備ができました！');
    console.log('\n次のステップ:');
    console.log('1. .env.localの NEXT_PUBLIC_USE_FIREBASE=true に変更');
    console.log('2. npm run dev で開発サーバーを再起動');
    console.log('3. http://localhost:3000/login でログイン');

  } catch (error) {
    console.error('\nエラーが発生しました:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('\n管理者ユーザーが見つかりません。');
      console.error('Firebase Consoleで以下のユーザーを作成してください:');
      console.error('- Email: admin@beeartena.jp');
      console.error('- Password: BeeArtEna2024Admin!');
    } else if (error.code === 'auth/wrong-password') {
      console.error('\nパスワードが正しくありません。');
      console.error('正しいパスワード: BeeArtEna2024Admin!');
    } else if (error.code === 'auth/network-request-failed') {
      console.error('\nネットワークエラーです。インターネット接続を確認してください。');
    }
  }

  process.exit(0);
}

// 実行
setupAdminUser();