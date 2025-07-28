/**
 * Firebase Admin SDKを使用した初期データ投入スクリプト
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'beeart-ena'
});

const auth = admin.auth();
const db = admin.firestore();

async function initializeFirebaseData() {
  try {
    console.log('🚀 Firebase初期データの投入を開始します...');

    // 1. 管理者ユーザーの作成
    console.log('👤 管理者ユーザーを作成中...');
    let adminUser;
    try {
      adminUser = await auth.createUser({
        email: 'admin@beeartena.com',
        password: 'BeeArtEna2024Admin!',
        displayName: '管理者',
        emailVerified: true
      });
      console.log('✅ 管理者ユーザーを作成しました');
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  管理者ユーザーは既に存在します');
        adminUser = await auth.getUserByEmail('admin@beeartena.com');
      } else {
        throw error;
      }
    }

    // 2. Firestoreに管理者情報を保存
    console.log('📝 管理者情報を保存中...');
    await db.collection('users').doc(adminUser.uid).set({
      id: adminUser.uid,
      email: adminUser.email,
      name: '管理者',
      phone: '0000-00-0000',
      role: 'admin',
      points: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ 管理者情報を保存しました');

    // 3. 予約設定の初期化
    console.log('⚙️  予約設定を初期化中...');
    await db.collection('settings').doc('reservation').set({
      businessHours: [
        { dayOfWeek: 0, open: '10:00', close: '18:00', isOpen: false },
        { dayOfWeek: 1, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 2, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 4, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 5, open: '10:00', close: '18:00', isOpen: true },
        { dayOfWeek: 6, open: '10:00', close: '18:00', isOpen: false }
      ],
      slotDuration: 60,
      maxCapacityPerSlot: 1,
      blockedDates: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ 予約設定を初期化しました');

    // 4. サービスメニューの初期化
    console.log('📋 サービスメニューを作成中...');
    const services = [
      { id: '2d-eyebrow', category: '2D', name: '2D眉毛', description: '自然で美しい眉毛を演出', price: 30000, duration: 60, isActive: true },
      { id: '3d-eyebrow', category: '3D', name: '3D眉毛', description: '立体的でリアルな眉毛', price: 50000, duration: 90, isActive: true },
      { id: '4d-eyebrow', category: '4D', name: '4D眉毛', description: '最新技術による極めて自然な眉毛', price: 70000, duration: 120, isActive: true },
      { id: '2d-lips', category: '2D', name: '2Dリップ', description: '美しい唇の色と形', price: 40000, duration: 60, isActive: true },
      { id: '3d-lips', category: '3D', name: '3Dリップ', description: '立体的で魅力的な唇', price: 60000, duration: 90, isActive: true }
    ];

    for (const service of services) {
      await db.collection('services').doc(service.id).set({
        ...service,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    console.log('✅ サービスメニューを作成しました');

    // 5. ポイント設定の初期化
    console.log('💎 ポイント設定を初期化中...');
    await db.collection('settings').doc('points').set({
      earnRate: 0.05,
      birthdayBonus: 1000,
      expirationDays: 365,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ ポイント設定を初期化しました');

    // 6. テストユーザーの作成
    console.log('🧪 テストユーザーを作成中...');
    let testUser;
    try {
      testUser = await auth.createUser({
        email: 'test@example.com',
        password: 'testpass123',
        displayName: 'テスト太郎',
        emailVerified: true
      });
      console.log('✅ テストユーザーを作成しました');
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  テストユーザーは既に存在します');
        testUser = await auth.getUserByEmail('test@example.com');
      } else {
        console.error('テストユーザー作成エラー:', error);
      }
    }

    if (testUser) {
      await db.collection('users').doc(testUser.uid).set({
        id: testUser.uid,
        email: testUser.email,
        name: 'テスト太郎',
        phone: '090-1234-5678',
        role: 'customer',
        points: 500,
        birthday: '1990-01-15',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log('\n🎉 初期データの投入が完了しました！');
    console.log('\n📝 ログイン情報:');
    console.log('【管理者】');
    console.log('Email: admin@beeartena.com');
    console.log('Password: BeeArtEna2024Admin!');
    console.log('\n【テストユーザー】');
    console.log('Email: test@example.com');
    console.log('Password: testpass123');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
initializeFirebaseData();