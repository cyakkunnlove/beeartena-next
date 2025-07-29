#!/usr/bin/env node

const admin = require('firebase-admin')
const serviceAccount = require('./firebase-service-account-key.json')

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'beeart-ena',
})

const auth = admin.auth()

async function testAdminLogin() {
  try {
    // 管理者ユーザーの情報を取得
    const adminUser = await auth.getUserByEmail('admin@beeartena.jp')
    console.log('管理者ユーザー情報:')
    console.log('- UID:', adminUser.uid)
    console.log('- Email:', adminUser.email)
    console.log('- Email Verified:', adminUser.emailVerified)
    console.log('- Display Name:', adminUser.displayName)
    console.log('- Created:', adminUser.metadata.creationTime)
    console.log('- Last Sign In:', adminUser.metadata.lastSignInTime)
    
    console.log('\n✅ 管理者アカウントが存在します')
    console.log('\n本番環境でのログイン情報:')
    console.log('Email: admin@beeartena.jp')
    console.log('Password: BeeArtEna2024Admin!')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ エラー:', error.message)
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n管理者アカウントが存在しません。作成してください。')
    }
    
    process.exit(1)
  }
}

testAdminLogin()