const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs } = require('firebase/firestore');

// Firebase設定
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
const auth = getAuth(app);
const db = getFirestore(app);

async function setupFirebaseAdmin() {
  console.log('🚀 Firebase管理者セットアップを開始します...\n');

  try {
    // 1. 管理者アカウントの作成
    console.log('📝 管理者アカウントを作成中...');
    const adminEmail = 'admin@beeartena.jp';
    const adminPassword = 'BeeArtEna2024Admin!'; // 環境変数から取得
    
    let adminUser;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      adminUser = userCredential.user;
      console.log('✅ 管理者アカウントを作成しました');
      console.log('   UID:', adminUser.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️  管理者アカウントは既に存在します');
        // 既存のアカウントでログイン
        const { signInWithEmailAndPassword } = require('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        adminUser = userCredential.user;
        console.log('✅ 既存の管理者アカウントでログインしました');
        console.log('   UID:', adminUser.uid);
      } else {
        throw error;
      }
    }

    // 2. 管理者データをFirestoreに作成
    console.log('\n📝 管理者データをFirestoreに保存中...');
    await setDoc(doc(db, 'users', adminUser.uid), {
      email: adminEmail,
      name: '管理者',
      phone: '090-5278-5221',
      role: 'admin',
      points: 0,
      totalSpent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ 管理者データを保存しました');

    // 3. 予約設定の初期化
    console.log('\n📝 予約設定を初期化中...');
    await setDoc(doc(db, 'settings', 'reservation_settings'), {
      slotDuration: 120,
      maxCapacityPerSlot: 1,
      businessHours: [
        { dayOfWeek: 0, open: '', close: '', isOpen: false },
        { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true },
        { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true },
        { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true },
        { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true },
        { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true },
        { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true }
      ],
      blockedDates: [],
      updatedAt: serverTimestamp()
    });
    console.log('✅ 予約設定を初期化しました');

    // 4. サンプルデータの作成（オプション）
    if (process.argv.includes('--sample')) {
      console.log('\n📝 サンプルデータを作成中...');
      
      // サンプル顧客
      const customerId = `customer_${Date.now()}`;
      await setDoc(doc(db, 'users', customerId), {
        email: 'sample@example.com',
        name: 'サンプル 花子',
        phone: '090-1111-2222',
        role: 'customer',
        points: 1000,
        totalSpent: 150000,
        birthday: '1990-03-15',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ サンプル顧客を作成しました (ID:', customerId, ')');
      
      // サンプル予約
      const reservationRef = doc(collection(db, 'reservations'));
      await setDoc(reservationRef, {
        customerId: customerId,
        customerName: 'サンプル 花子',
        customerEmail: 'sample@example.com',
        customerPhone: '090-1111-2222',
        serviceType: '4D',
        serviceName: '4Dパウダー&フェザー',
        price: 70000,
        date: new Date().toISOString().split('T')[0],
        time: '13:00',
        status: 'confirmed',
        notes: 'サンプル予約です',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ サンプル予約を作成しました (ID:', reservationRef.id, ')');
    }

    // 5. データの確認
    console.log('\n📊 現在のデータ状況:');
    
    // ユーザー数の確認
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`   - ユーザー数: ${usersSnapshot.size}`);
    
    // 予約数の確認
    const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
    console.log(`   - 予約数: ${reservationsSnapshot.size}`);
    
    console.log('\n🎉 セットアップが完了しました！');
    console.log('\n次のステップ:');
    console.log('1. Firebase Console (https://console.firebase.google.com/project/beeart-ena) で確認');
    console.log('2. テストHTMLファイルを開いて動作確認:');
    console.log('   open test-firebase-integration.html');
    console.log('\n管理者ログイン情報:');
    console.log('   メール:', adminEmail);
    console.log('   パスワード:', adminPassword);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 実行
setupFirebaseAdmin();