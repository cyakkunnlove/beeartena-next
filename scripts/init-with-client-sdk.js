/**
 * Firebase Client SDKを使用した初期データ投入スクリプト
 * Admin SDKの権限問題を回避
 */

const { initializeApp } = require('firebase/app')
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('firebase/auth')
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: 'AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA',
  authDomain: 'beeart-ena.firebaseapp.com',
  projectId: 'beeart-ena',
  storageBucket: 'beeart-ena.appspot.com',
  messagingSenderId: '47862693911',
  appId: '1:47862693911:web:f7181ecac113393d5c9c52',
}

async function initializeFirebaseData() {
  try {
    console.log('🚀 初期データの投入を開始します...')

    // Firebaseの初期化
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const db = getFirestore(app)

    // 1. 管理者ユーザーの作成
    console.log('👤 管理者ユーザーを作成中...')
    let adminUser
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        'admin@beeartena.com',
        'BeeArtEna2024Admin!',
      )
      adminUser = userCredential.user
      console.log('✅ 管理者ユーザーを作成しました')
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️  管理者ユーザーは既に存在します')
        // 既存ユーザーでログイン
        const userCredential = await signInWithEmailAndPassword(
          auth,
          'admin@beeartena.com',
          'BeeArtEna2024Admin!',
        )
        adminUser = userCredential.user
      } else {
        throw error
      }
    }

    // 2. Firestoreに管理者情報を保存
    console.log('📝 管理者情報を保存中...')
    await setDoc(doc(db, 'users', adminUser.uid), {
      id: adminUser.uid,
      email: adminUser.email,
      name: '管理者',
      phone: '0000-00-0000',
      role: 'admin',
      points: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('✅ 管理者情報を保存しました')

    // 3. 予約設定の初期化
    console.log('⚙️  予約設定を初期化中...')
    await setDoc(doc(db, 'settings', 'reservation'), {
      businessHours: [
        { dayOfWeek: 0, open: '10:00', close: '18:00', isOpen: false },
        { dayOfWeek: 1, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 2, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 4, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 5, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 6, open: '10:00', close: '18:00', isOpen: false },
      ],
      slotDuration: 60,
      maxCapacityPerSlot: 1,
      blockedDates: [],
      updatedAt: serverTimestamp(),
    })
    console.log('✅ 予約設定を初期化しました')

    // 4. サービスメニューの初期化
    console.log('📋 サービスメニューを作成中...')
    const services = [
      {
        id: '2d-eyebrow',
        category: '2D',
        name: '2D眉毛',
        description: '自然で美しい眉毛を演出',
        price: 30000,
        duration: 60,
        isActive: true,
      },
      {
        id: '3d-eyebrow',
        category: '3D',
        name: '3D眉毛',
        description: '立体的でリアルな眉毛',
        price: 50000,
        duration: 90,
        isActive: true,
      },
      {
        id: '4d-eyebrow',
        category: '4D',
        name: '4D眉毛',
        description: '最新技術による極めて自然な眉毛',
        price: 70000,
        duration: 120,
        isActive: true,
      },
      {
        id: '2d-lips',
        category: '2D',
        name: '2Dリップ',
        description: '美しい唇の色と形',
        price: 40000,
        duration: 60,
        isActive: true,
      },
      {
        id: '3d-lips',
        category: '3D',
        name: '3Dリップ',
        description: '立体的で魅力的な唇',
        price: 60000,
        duration: 90,
        isActive: true,
      },
    ]

    for (const service of services) {
      await setDoc(doc(db, 'services', service.id), {
        ...service,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    console.log('✅ サービスメニューを作成しました')

    // 5. ポイント設定の初期化
    console.log('💎 ポイント設定を初期化中...')
    await setDoc(doc(db, 'settings', 'points'), {
      earnRate: 0.05,
      birthdayBonus: 1000,
      expirationDays: 365,
      updatedAt: serverTimestamp(),
    })
    console.log('✅ ポイント設定を初期化しました')

    // 6. テストユーザーの作成
    console.log('🧪 テストユーザーを作成中...')
    try {
      const testCredential = await createUserWithEmailAndPassword(
        auth,
        'test@example.com',
        'testpass123',
      )
      const testUser = testCredential.user

      await setDoc(doc(db, 'users', testUser.uid), {
        id: testUser.uid,
        email: testUser.email,
        name: 'テスト太郎',
        phone: '090-1234-5678',
        role: 'customer',
        points: 500,
        birthday: '1990-01-15',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log('✅ テストユーザーを作成しました')
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️  テストユーザーは既に存在します')
      } else {
        console.error('テストユーザー作成エラー:', error)
      }
    }

    console.log('\n🎉 初期データの投入が完了しました！')
    console.log('\n📝 ログイン情報:')
    console.log('【管理者】')
    console.log('Email: admin@beeartena.com')
    console.log('Password: BeeArtEna2024Admin!')
    console.log('\n【テストユーザー】')
    console.log('Email: test@example.com')
    console.log('Password: testpass123')

    process.exit(0)
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
initializeFirebaseData()
