#!/usr/bin/env node

const admin = require('firebase-admin')
const serviceAccount = require('./firebase-service-account-key.json')

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'beeart-ena',
})

const auth = admin.auth()

async function updateAdminPassword() {
  try {
    // 管理者ユーザーを取得
    const adminUser = await auth.getUserByEmail('admin@beeartena.jp')
    console.log('管理者ユーザー found:', adminUser.uid)
    
    // パスワードを更新（本番環境用）
    await auth.updateUser(adminUser.uid, {
      password: 'BeeArtEna2024Admin!'
    })
    
    console.log('✅ パスワードを更新しました')
    console.log('Email: admin@beeartena.jp')
    console.log('Password: BeeArtEna2024Admin!')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

updateAdminPassword()