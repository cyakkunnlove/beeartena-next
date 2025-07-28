/**
 * 管理者アカウントの認証テストスクリプト
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA",
  authDomain: "beeart-ena.firebaseapp.com",
  projectId: "beeart-ena",
  storageBucket: "beeart-ena.appspot.com",
  messagingSenderId: "47862693911",
  appId: "1:47862693911:web:f7181ecac113393d5c9c52"
};

async function checkAdminAuth() {
  try {
    console.log('🔍 管理者アカウントの認証をテストします...\n');

    // Firebaseの初期化
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 管理者アカウントでログイン試行
    console.log('👤 管理者アカウントでログイン中...');
    console.log('Email: admin@beeartena.com');
    console.log('Password: BeeArtEna2024Admin!');
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        'admin@beeartena.com', 
        'BeeArtEna2024Admin!'
      );
      
      console.log('✅ Firebase Authenticationへのログイン: 成功');
      console.log('UID:', userCredential.user.uid);
      
      // Firestoreからユーザー情報を取得
      console.log('\n📄 Firestoreからユーザー情報を取得中...');
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ ユーザー情報の取得: 成功');
        console.log('ユーザーデータ:', JSON.stringify(userData, null, 2));
        
        if (userData.role === 'admin') {
          console.log('✅ 管理者権限: 確認済み');
        } else {
          console.log('❌ エラー: roleが管理者ではありません');
          console.log('現在のrole:', userData.role);
        }
      } else {
        console.log('❌ エラー: Firestoreにユーザー情報が存在しません');
        console.log('UIDでユーザードキュメントを作成する必要があります:', userCredential.user.uid);
      }
      
    } catch (authError) {
      console.log('❌ ログインエラー:', authError.code);
      console.log('エラーメッセージ:', authError.message);
      
      if (authError.code === 'auth/user-not-found') {
        console.log('\n⚠️  管理者アカウントが存在しません');
        console.log('Firebase Consoleで手動作成が必要です:');
        console.log('1. https://console.firebase.google.com/project/beeart-ena/authentication/users');
        console.log('2. "ユーザーを追加"をクリック');
        console.log('3. Email: admin@beeartena.com');
        console.log('4. Password: BeeArtEna2024Admin!');
      } else if (authError.code === 'auth/wrong-password') {
        console.log('\n⚠️  パスワードが正しくありません');
        console.log('Firebase Consoleでパスワードをリセットしてください');
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 実行
checkAdminAuth();