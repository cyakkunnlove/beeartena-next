/**
 * Firebase接続テストスクリプト
 */

const admin = require('firebase-admin')
const serviceAccount = require('./firebase-service-account-key.json')

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'beeart-ena',
})

const db = admin.firestore()

async function testConnection() {
  try {
    console.log('🔍 Firebase接続をテスト中...')

    // Firestoreへの書き込みテスト
    const testDoc = {
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }

    await db.collection('test').doc('connection-test').set(testDoc)
    console.log('✅ Firestoreへの書き込み: 成功')

    // 読み取りテスト
    const doc = await db.collection('test').doc('connection-test').get()
    if (doc.exists) {
      console.log('✅ Firestoreからの読み取り: 成功')
    }

    // クリーンアップ
    await db.collection('test').doc('connection-test').delete()
    console.log('✅ テストドキュメントを削除しました')

    console.log('\n🎉 Firebase接続テスト完了！初期化スクリプトを実行できます。')
  } catch (error) {
    console.error('❌ エラー:', error.message)

    if (error.code === 7) {
      console.log('\n⚠️  Firestoreのセキュリティルールを一時的に開放してください:')
      console.log('rules_version = "2";')
      console.log('service cloud.firestore {')
      console.log('  match /databases/{database}/documents {')
      console.log('    match /{document=**} {')
      console.log('      allow read, write: if true;')
      console.log('    }')
      console.log('  }')
      console.log('}')
    }
  }

  process.exit(0)
}

testConnection()
