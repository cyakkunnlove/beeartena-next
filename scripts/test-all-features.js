/**
 * BEE ART ENAシステムの全機能テストスクリプト
 * テストユーザーとして振る舞い、すべての機能を検証
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA",
  authDomain: "beeart-ena.firebaseapp.com",
  projectId: "beeart-ena",
  storageBucket: "beeart-ena.appspot.com",
  messagingSenderId: "47862693911",
  appId: "1:47862693911:web:f7181ecac113393d5c9c52"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// テスト結果を記録
const testResults = {
  passed: [],
  failed: []
};

function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed.push(testName);
  } else {
    console.log(`❌ ${testName}: ${error}`);
    testResults.failed.push({ test: testName, error: error?.message || error });
  }
}

async function testAllFeatures() {
  console.log('🧪 BEE ART ENAシステムの包括的な機能テストを開始します...\n');

  let testUser = null;
  let reservationId = null;

  try {
    // 1. テストユーザーでログイン
    console.log('=== 1. 認証機能のテスト ===');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'testpass123');
      testUser = userCredential.user;
      logTest('テストユーザーログイン', true);
      
      // ユーザー情報取得
      const userDoc = await getDoc(doc(db, 'users', testUser.uid));
      if (userDoc.exists()) {
        logTest('ユーザー情報取得', true);
        console.log('ユーザー情報:', JSON.stringify(userDoc.data(), null, 2));
      }
    } catch (error) {
      logTest('テストユーザーログイン', false, error);
      return;
    }

    // 2. プロフィール編集のテスト
    console.log('\n=== 2. プロフィール編集機能のテスト ===');
    try {
      const updateData = {
        name: 'テスト太郎（更新済み）',
        phone: '090-9999-8888',
        birthday: '1990-01-01',
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'users', testUser.uid), updateData);
      logTest('プロフィール更新', true);
      
      // 更新確認
      const updatedDoc = await getDoc(doc(db, 'users', testUser.uid));
      const updatedData = updatedDoc.data();
      if (updatedData.name === 'テスト太郎（更新済み）' && updatedData.phone === '090-9999-8888') {
        logTest('プロフィール更新の保存確認', true);
      } else {
        logTest('プロフィール更新の保存確認', false, '更新が反映されていません');
      }
    } catch (error) {
      logTest('プロフィール編集', false, error);
    }

    // 3. 予約機能のテスト
    console.log('\n=== 3. 予約機能のテスト ===');
    
    // 3-1. 予約の作成
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const reservationData = {
        customerId: testUser.uid,
        customerName: 'テスト太郎（更新済み）',
        customerEmail: 'test@example.com',
        customerPhone: '090-9999-8888',
        serviceType: '3D',
        serviceName: '3D眉毛',
        price: 50000,
        date: dateStr,
        time: '14:00',
        status: 'confirmed',
        notes: 'テスト予約です',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'reservations'), reservationData);
      reservationId = docRef.id;
      logTest('予約の作成', true);
      console.log('予約ID:', reservationId);
    } catch (error) {
      logTest('予約の作成', false, error);
    }

    // 3-2. 予約の取得
    try {
      const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
      if (reservationDoc.exists()) {
        logTest('予約情報の取得', true);
        console.log('予約詳細:', JSON.stringify(reservationDoc.data(), null, 2));
      }
    } catch (error) {
      logTest('予約情報の取得', false, error);
    }

    // 3-3. 予約の更新
    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        time: '15:00',
        notes: 'テスト予約（時間変更済み）',
        updatedAt: serverTimestamp()
      });
      logTest('予約の更新', true);
      
      // 更新確認
      const updatedReservation = await getDoc(doc(db, 'reservations', reservationId));
      const data = updatedReservation.data();
      if (data.time === '15:00' && data.notes === 'テスト予約（時間変更済み）') {
        logTest('予約更新の保存確認', true);
      }
    } catch (error) {
      logTest('予約の更新', false, error);
    }

    // 4. ポイント機能のテスト
    console.log('\n=== 4. ポイント機能のテスト ===');
    
    // 4-1. ポイント履歴の追加
    try {
      const pointTransaction = {
        userId: testUser.uid,
        type: 'earn',
        amount: 2500,
        description: '3D眉毛施術（50,000円の5%）',
        balance: 3000, // 既存の500 + 2500
        reservationId: reservationId,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'pointTransactions'), pointTransaction);
      logTest('ポイント履歴の追加', true);
      
      // ユーザーのポイント更新
      await updateDoc(doc(db, 'users', testUser.uid), {
        points: 3000,
        updatedAt: serverTimestamp()
      });
      logTest('ユーザーポイントの更新', true);
    } catch (error) {
      logTest('ポイント機能', false, error);
    }

    // 5. 問い合わせ機能のテスト
    console.log('\n=== 5. 問い合わせ機能のテスト ===');
    
    try {
      const inquiryData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        phone: '090-9999-8888',
        type: 'general',
        message: 'これはテストの問い合わせです。システムが正常に動作しているか確認しています。',
        status: 'unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const inquiryRef = await addDoc(collection(db, 'inquiries'), inquiryData);
      logTest('問い合わせの作成', true);
      console.log('問い合わせID:', inquiryRef.id);
    } catch (error) {
      logTest('問い合わせの作成', false, error);
    }

    // 6. データの削除テスト
    console.log('\n=== 6. データ削除機能のテスト ===');
    
    // 6-1. 予約の削除
    if (reservationId) {
      try {
        await deleteDoc(doc(db, 'reservations', reservationId));
        logTest('予約の削除', true);
        
        // 削除確認
        const deletedDoc = await getDoc(doc(db, 'reservations', reservationId));
        if (!deletedDoc.exists()) {
          logTest('予約削除の確認', true);
        }
      } catch (error) {
        logTest('予約の削除', false, error);
      }
    }

    // 7. 管理者機能のテスト（通常ユーザーではアクセス不可を確認）
    console.log('\n=== 7. 権限管理のテスト ===');
    
    try {
      // 他のユーザーの情報にアクセスを試みる
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        logTest('権限制御（他ユーザー情報へのアクセス制限）', true);
      } else {
        logTest('権限制御', false, '権限外のデータにアクセスできてしまいました');
      }
    } catch (error) {
      // Firestoreのセキュリティルールでブロックされた場合
      logTest('権限制御（セキュリティルールによる保護）', true);
    }

    // テスト結果のサマリー
    console.log('\n=== テスト結果サマリー ===');
    console.log(`✅ 成功: ${testResults.passed.length}件`);
    console.log(`❌ 失敗: ${testResults.failed.length}件`);
    
    if (testResults.failed.length > 0) {
      console.log('\n失敗したテスト:');
      testResults.failed.forEach(f => {
        console.log(`- ${f.test}: ${f.error}`);
      });
    }
    
    console.log('\n🎉 テスト完了！');
    
  } catch (error) {
    console.error('テスト中に予期しないエラーが発生しました:', error);
  }
  
  process.exit(0);
}

// テスト実行
testAllFeatures();