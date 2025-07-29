const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Firebase設定（.env.localから）
const firebaseConfig = {
  apiKey: "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA",
  authDomain: "beeart-ena.firebaseapp.com", 
  projectId: "beeart-ena",
  storageBucket: "beeart-ena.appspot.com",
  messagingSenderId: "47862693911",
  appId: "1:47862693911:web:f7181ecac113393d5c9c52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyFirebaseSetup() {
  console.log('🔍 Firebase設定を確認中...\n');

  const results = {
    collections: {},
    settings: null,
    errors: []
  };

  try {
    // 1. 各コレクションの確認
    const collectionsToCheck = ['users', 'reservations', 'points', 'inquiries', 'settings'];
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`📁 ${collectionName}コレクションを確認中...`);
        const querySnapshot = await getDocs(collection(db, collectionName));
        results.collections[collectionName] = {
          exists: true,
          count: querySnapshot.size,
          documents: []
        };
        
        // 最初の3件のドキュメントを取得
        let count = 0;
        querySnapshot.forEach((doc) => {
          if (count < 3) {
            results.collections[collectionName].documents.push({
              id: doc.id,
              data: doc.data()
            });
            count++;
          }
        });
        
        console.log(`   ✅ ${querySnapshot.size}件のドキュメント`);
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
        results.collections[collectionName] = {
          exists: false,
          error: error.message
        };
        results.errors.push(`${collectionName}: ${error.message}`);
      }
    }

    // 2. 設定ドキュメントの確認
    console.log('\n⚙️  予約設定を確認中...');
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'reservation_settings'));
      if (settingsDoc.exists()) {
        results.settings = settingsDoc.data();
        console.log('   ✅ 予約設定が存在します');
      } else {
        console.log('   ❌ 予約設定が見つかりません');
        results.errors.push('予約設定ドキュメントが存在しません');
      }
    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}`);
      results.errors.push(`予約設定: ${error.message}`);
    }

    // 3. 結果のサマリー
    console.log('\n📊 確認結果サマリー:');
    console.log('=====================================');
    
    if (results.errors.length === 0) {
      console.log('✅ すべての確認項目をパスしました！\n');
    } else {
      console.log(`⚠️  ${results.errors.length}個のエラーが見つかりました:\n`);
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // 4. コレクションの詳細
    console.log('\n📋 コレクションの詳細:');
    console.log('=====================================');
    for (const [name, data] of Object.entries(results.collections)) {
      if (data.exists) {
        console.log(`\n【${name}】${data.count}件`);
        if (data.documents.length > 0) {
          data.documents.forEach((doc) => {
            console.log(`  - ${doc.id}: ${JSON.stringify(doc.data).substring(0, 100)}...`);
          });
        }
      }
    }

    // 5. 推奨事項
    console.log('\n💡 推奨事項:');
    console.log('=====================================');
    
    if (!results.collections.users?.documents.some(doc => doc.data.role === 'admin')) {
      console.log('⚠️  管理者アカウントが見つかりません');
      console.log('   → Firebase Consoleで管理者を作成してください');
    }
    
    if (!results.settings) {
      console.log('⚠️  予約設定が見つかりません');
      console.log('   → 初期設定スクリプトを実行してください');
    }
    
    if (results.collections.reservations?.count === 0) {
      console.log('ℹ️  予約データがありません');
      console.log('   → テスト予約を作成して動作確認してください');
    }

    // 6. 次のステップ
    console.log('\n🚀 次のステップ:');
    console.log('=====================================');
    console.log('1. test-firebase-integration.html を開いて統合テストを実行');
    console.log('2. 管理者アカウントでログインして機能を確認');
    console.log('3. 新規顧客と予約を作成してフローをテスト');
    
  } catch (error) {
    console.error('\n❌ 重大なエラーが発生しました:', error);
    results.errors.push(`重大なエラー: ${error.message}`);
  }

  return results;
}

// 実行
verifyFirebaseSetup().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});