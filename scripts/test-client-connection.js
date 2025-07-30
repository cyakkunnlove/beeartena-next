const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } = require('firebase/auth');

// 環境変数を直接設定（.env.localの内容をコピー）
const firebaseConfig = {
  apiKey: 'AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA',
  authDomain: 'beeart-ena.firebaseapp.com',
  projectId: 'beeart-ena',
  storageBucket: 'beeart-ena.appspot.com',
  messagingSenderId: '47862693911',
  appId: '1:47862693911:web:f7181ecac113393d5c9c52',
};

console.log('🔧 Firebase設定:');
console.log('API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '未設定');
console.log('Project ID:', firebaseConfig.projectId || '未設定');
console.log('Auth Domain:', firebaseConfig.authDomain || '未設定');
console.log('---');

async function testConnection() {
  try {
    // Firebaseを初期化
    console.log('🚀 Firebaseを初期化中...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    console.log('✅ Firebase初期化成功');

    // Firestoreへの読み取りテスト
    console.log('\n📖 Firestore読み取りテスト...');
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      console.log(`✅ Firestore読み取り成功: ${snapshot.size}件のユーザーが見つかりました`);
      
      if (snapshot.size > 0) {
        console.log('既存ユーザー:');
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ${data.email} (${data.name})`);
        });
      }
    } catch (error) {
      console.error('❌ Firestore読み取りエラー:', error.message);
    }

    // 予約データの確認
    console.log('\n📅 予約データ確認...');
    try {
      const reservationsRef = collection(db, 'reservations');
      const snapshot = await getDocs(reservationsRef);
      console.log(`✅ 予約データ読み取り成功: ${snapshot.size}件の予約が見つかりました`);
      
      if (snapshot.size > 0) {
        const today = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.date === today) {
            todayCount++;
          }
        });
        
        console.log(`本日（${today}）の予約: ${todayCount}件`);
      }
    } catch (error) {
      console.error('❌ 予約データ読み取りエラー:', error.message);
    }

    // テストデータの書き込み
    console.log('\n✍️ Firestoreテストデータ書き込み...');
    let testDocId = null;
    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Firebase接続テスト'
      };
      
      const docRef = await addDoc(collection(db, 'test'), testData);
      testDocId = docRef.id;
      console.log('✅ テストデータ書き込み成功:', docRef.id);
      
      // テストデータを削除
      await deleteDoc(doc(db, 'test', testDocId));
      console.log('✅ テストデータ削除成功');
    } catch (error) {
      console.error('❌ Firestore書き込みエラー:', error.message);
    }

    // 認証テスト
    console.log('\n🔐 Firebase認証テスト...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    let testUser = null;
    
    try {
      // テストユーザー作成
      console.log('テストユーザー作成中...');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      testUser = userCredential.user;
      console.log('✅ テストユーザー作成成功:', testEmail);
      
      // ログアウト
      await auth.signOut();
      
      // 再ログイン
      console.log('再ログインテスト中...');
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ 再ログイン成功');
      
      // テストユーザー削除
      if (testUser) {
        await deleteUser(testUser);
        console.log('✅ テストユーザー削除成功');
      }
    } catch (error) {
      console.error('❌ 認証テストエラー:', error.message);
      
      // エラーが発生してもテストユーザーは削除を試みる
      if (testUser) {
        try {
          await deleteUser(testUser);
        } catch (e) {
          // 削除エラーは無視
        }
      }
    }

    console.log('\n✅ すべてのテストが完了しました');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('エラー詳細:', error.message);
    
    if (error.code) {
      console.error('エラーコード:', error.code);
      
      // よくあるエラーの解決方法を提案
      if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        console.log('\n💡 解決方法:');
        console.log('1. .env.localファイルのNEXT_PUBLIC_FIREBASE_API_KEYが正しいか確認してください');
        console.log('2. Firebase ConsoleでAPIキーを再確認してください');
      } else if (error.code === 'permission-denied') {
        console.log('\n💡 解決方法:');
        console.log('1. Firebase ConsoleでFirestoreのセキュリティルールを確認してください');
        console.log('2. 開発中は以下のルールを使用できます:');
        console.log('   allow read, write: if true;');
      }
    }
  }
  
  process.exit(0);
}

// 実行
testConnection();