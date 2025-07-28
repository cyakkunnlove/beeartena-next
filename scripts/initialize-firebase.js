/**
 * Firebase初期データ投入スクリプト
 * 
 * 使用方法:
 * 1. Firebase Admin SDKのサービスアカウントキーをダウンロード
 * 2. このファイルと同じディレクトリに配置
 * 3. node scripts/initialize-firebase.js を実行
 */

const admin = require('firebase-admin');

// サービスアカウントキーのパスを環境に応じて変更してください
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function initializeDatabase() {
  try {
    console.log('🚀 Firebase初期データの投入を開始します...');

    // 1. 管理者ユーザーの作成
    console.log('👤 管理者ユーザーを作成中...');
    let adminUser;
    try {
      adminUser = await auth.createUser({
        email: 'admin@beeartena.com',
        password: 'ChangeThisPassword123!', // 必ず変更してください
        displayName: '管理者',
        emailVerified: true
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  管理者ユーザーは既に存在します');
        adminUser = await auth.getUserByEmail('admin@beeartena.com');
      } else {
        throw error;
      }
    }

    // 2. Firestoreに管理者情報を保存
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
    console.log('✅ 管理者ユーザーを作成しました');

    // 3. 予約設定の初期化
    console.log('⚙️  予約設定を初期化中...');
    await db.collection('settings').doc('reservation').set({
      businessHours: [
        { dayOfWeek: 0, open: '10:00', close: '18:00', isOpen: false }, // 日曜日
        { dayOfWeek: 1, open: '10:00', close: '18:00', isOpen: true },  // 月曜日
        { dayOfWeek: 2, open: '10:00', close: '18:00', isOpen: true },  // 火曜日
        { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true },  // 水曜日
        { dayOfWeek: 4, open: '10:00', close: '18:00', isOpen: true },  // 木曜日
        { dayOfWeek: 5, open: '10:00', close: '18:00', isOpen: true },  // 金曜日
        { dayOfWeek: 6, open: '10:00', close: '18:00', isOpen: false }  // 土曜日
      ],
      slotDuration: 60, // 1予約あたり60分
      maxCapacityPerSlot: 1, // 1時間枠あたり1予約まで
      blockedDates: [], // 特別休業日（初期は空）
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ 予約設定を初期化しました');

    // 4. サービスメニューの初期化
    console.log('📋 サービスメニューを作成中...');
    const services = [
      {
        id: '2d-eyebrow',
        category: '2D',
        name: '2D眉毛',
        description: '自然で美しい眉毛を演出',
        price: 30000,
        duration: 60,
        isActive: true
      },
      {
        id: '3d-eyebrow',
        category: '3D',
        name: '3D眉毛',
        description: '立体的でリアルな眉毛',
        price: 50000,
        duration: 90,
        isActive: true
      },
      {
        id: '4d-eyebrow',
        category: '4D',
        name: '4D眉毛',
        description: '最新技術による極めて自然な眉毛',
        price: 70000,
        duration: 120,
        isActive: true
      },
      {
        id: '2d-lips',
        category: '2D',
        name: '2Dリップ',
        description: '美しい唇の色と形',
        price: 40000,
        duration: 60,
        isActive: true
      },
      {
        id: '3d-lips',
        category: '3D',
        name: '3Dリップ',
        description: '立体的で魅力的な唇',
        price: 60000,
        duration: 90,
        isActive: true
      }
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
      earnRate: 0.05, // 5%還元
      birthdayBonus: 1000, // 誕生日ボーナス1000ポイント
      expirationDays: 365, // 365日で失効
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ ポイント設定を初期化しました');

    // 6. テストユーザーの作成（開発用）
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 テストユーザーを作成中...');
      const testUser = await auth.createUser({
        email: 'test@example.com',
        password: 'testpass123',
        displayName: 'テスト太郎',
        emailVerified: true
      });

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
      console.log('✅ テストユーザーを作成しました');
    }

    console.log('\n🎉 初期データの投入が完了しました！');
    console.log('\n📝 次のステップ:');
    console.log('1. .env.localファイルにFirebase設定を記入');
    console.log('2. セキュリティルールを本番用に更新');
    console.log('3. npm run devで開発サーバーを起動');
    console.log('\n👤 管理者ログイン情報:');
    console.log('Email: admin@beeartena.com');
    console.log('Password: ChangeThisPassword123! (必ず変更してください)');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトの実行
initializeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });