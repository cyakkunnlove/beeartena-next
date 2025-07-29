#!/usr/bin/env node

const admin = require('firebase-admin')
const serviceAccount = require('./firebase-service-account-key.json')

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'beeart-ena',
})

const auth = admin.auth()
const db = admin.firestore()

async function fixAdminAccount() {
  try {
    console.log('管理者アカウントの修正を開始します...')
    
    // 管理者ユーザーを取得
    const adminUser = await auth.getUserByEmail('admin@beeartena.jp')
    
    // メール認証を有効化し、表示名を設定
    await auth.updateUser(adminUser.uid, {
      emailVerified: true,
      displayName: '管理者'
    })
    
    console.log('✅ Firebase Authのユーザー情報を更新しました')
    
    // Firestoreのユーザー情報も確認・更新
    const userDoc = await db.collection('users').doc(adminUser.uid).get()
    
    if (!userDoc.exists) {
      console.log('Firestoreにユーザー情報がありません。作成します...')
      await db.collection('users').doc(adminUser.uid).set({
        id: adminUser.uid,
        email: 'admin@beeartena.jp',
        name: '管理者',
        phone: '0000-00-0000',
        role: 'admin',
        points: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log('✅ Firestoreにユーザー情報を作成しました')
    } else {
      // roleがadminになっているか確認
      const userData = userDoc.data()
      if (userData.role !== 'admin') {
        await db.collection('users').doc(adminUser.uid).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log('✅ ユーザーのroleをadminに更新しました')
      } else {
        console.log('✅ ユーザー情報は正しく設定されています')
      }
    }
    
    console.log('\n🎉 管理者アカウントの修正が完了しました！')
    console.log('\n本番環境でのログイン情報:')
    console.log('Email: admin@beeartena.jp')
    console.log('Password: BeeArtEna2024Admin!')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

fixAdminAccount()