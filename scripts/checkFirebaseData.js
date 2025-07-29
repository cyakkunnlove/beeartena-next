const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'beeart-ena.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beeart-ena',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'beeart-ena.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '47862693911',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:47862693911:web:f7181ecac113393d5c9c52'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirebaseData() {
  try {
    console.log('Firebaseのデータを確認します...\n');

    // 各コレクションのデータ数を確認
    const collections = ['users', 'reservations', 'points', 'inquiries', 'settings'];
    
    for (const collectionName of collections) {
      console.log(`📁 ${collectionName}コレクション:`);
      
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        console.log(`  - ドキュメント数: ${querySnapshot.size}`);
        
        if (querySnapshot.size > 0) {
          console.log('  - ドキュメント一覧:');
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const preview = JSON.stringify(data).substring(0, 100);
            console.log(`    - ${doc.id}: ${preview}...`);
          });
        }
      } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('✅ 確認が完了しました');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
checkFirebaseData();