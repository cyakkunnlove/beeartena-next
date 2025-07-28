/**
 * Firestoreセキュリティルールを更新するスクリプト
 */

const admin = require('firebase-admin')
const fs = require('fs').promises
const path = require('path')

// すでに初期化されている場合は再初期化しない
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-service-account-key.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'beeart-ena',
  })
}

async function updateFirestoreRules() {
  try {
    console.log('🔒 Firestoreセキュリティルールを更新中...')

    // ルールファイルを読み込む
    const rulesPath = path.join(__dirname, '..', 'firebase-rules', 'firestore.rules')
    const rulesContent = await fs.readFile(rulesPath, 'utf8')

    // Firebase Admin SDKではセキュリティルールを直接更新できないため、
    // Firebase CLIまたはREST APIを使用する必要があります
    console.log('\n📋 以下のセキュリティルールをFirebaseコンソールで設定してください：')
    console.log('URL: https://console.firebase.google.com/project/beeart-ena/firestore/rules\n')
    console.log('='.repeat(80))
    console.log(rulesContent)
    console.log('='.repeat(80))

    console.log('\n✅ 上記のルールをコピーして、Firebaseコンソールで更新してください。')
    console.log('⚠️  重要: セキュリティルールの更新により、適切なアクセス制御が有効になります。')
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

// 実行
updateFirestoreRules()
