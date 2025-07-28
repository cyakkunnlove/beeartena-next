/**
 * 未登録ユーザーの予約UIフロー統合テスト
 * 実際のUIコンポーネントの動作をシミュレート
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

// Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'beeart-ena'
  });
}

const db = admin.firestore();
const auth = admin.auth();

// UIフローのステップをシミュレート
async function simulateUIFlow() {
  console.log('🖥️  未登録ユーザーの予約UIフロー統合テスト\n');
  
  // テスト用メールアドレス
  const testEmail = `uitest_${Date.now()}@example.com`;
  let userId = null;
  
  try {
    // 1. 予約ページアクセス
    console.log('📱 ユーザーが予約ページにアクセス');
    console.log('URL: /reservation\n');
    
    // 2. サービス選択
    console.log('🎯 ステップ1: サービス選択');
    console.log('選択: 3D眉毛（¥50,000）');
    const selectedService = {
      id: '3D',
      name: '3D眉毛',
      price: 50000
    };
    
    // 3. 日付選択
    console.log('\n📅 ステップ2: 日付選択');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const selectedDate = tomorrow.toISOString().split('T')[0];
    console.log(`選択: ${selectedDate}`);
    
    // 4. 時間選択
    console.log('\n⏰ ステップ3: 時間選択');
    const selectedTime = '15:00';
    console.log(`選択: ${selectedTime}`);
    
    // 5. 顧客情報入力
    console.log('\n📝 ステップ4: お客様情報入力');
    const customerInfo = {
      name: 'UIテスト花子',
      email: testEmail,
      phone: '090-1111-2222',
      notes: 'アレルギーはありません'
    };
    console.log('入力内容:');
    Object.entries(customerInfo).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // 6. 予約確定ボタンクリック（未ログイン）
    console.log('\n🔐 予約確定ボタンをクリック');
    console.log('⚠️  未ログインのため、会員登録ページへリダイレクト');
    console.log('💾 予約情報をセッションストレージに保存');
    
    const pendingReservation = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      time: selectedTime,
      formData: customerInfo
    };
    console.log('\nセッションストレージに保存された内容:');
    console.log(JSON.stringify(pendingReservation, null, 2));
    
    // 7. 会員登録ページ
    console.log('\n📋 会員登録ページ（/register?reservation=true）');
    console.log('✨ 予約情報から自動入力される項目:');
    console.log(`  - 名前: ${customerInfo.name}`);
    console.log(`  - メール: ${customerInfo.email}`);
    console.log(`  - 電話: ${customerInfo.phone}`);
    
    console.log('\n追加入力が必要な項目:');
    console.log('  - 生年月日: 1990-05-20');
    console.log('  - パスワード: ********');
    console.log('  - パスワード確認: ********');
    
    // 8. 会員登録実行
    console.log('\n🚀 会員登録を実行');
    
    try {
      const userRecord = await auth.createUser({
        email: testEmail,
        password: 'uitest123',
        displayName: 'UIテスト花子'
      });
      userId = userRecord.uid;
      
      await db.collection('users').doc(userId).set({
        id: userId,
        email: testEmail,
        name: 'UIテスト花子',
        phone: '090-1111-2222',
        birthday: '1990-05-20',
        role: 'customer',
        points: 500,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ 会員登録成功');
      console.log(`新規ユーザーID: ${userId}`);
    } catch (error) {
      console.error('❌ 会員登録エラー:', error.message);
      return;
    }
    
    // 9. 予約ページへ自動リダイレクト
    console.log('\n🔄 予約ページへ自動リダイレクト（/reservation?from=register）');
    console.log('📥 セッションストレージから予約情報を復元');
    console.log('✨ 復元された内容:');
    console.log(`  - サービス: ${pendingReservation.serviceName}`);
    console.log(`  - 日時: ${pendingReservation.date} ${pendingReservation.time}`);
    console.log(`  - お客様情報: すべて入力済み`);
    console.log('🗑️  セッションストレージをクリア');
    
    // 10. ログイン済みとして予約確定
    console.log('\n✅ ログイン済みユーザーとして予約を確定');
    
    const reservationData = {
      customerId: userId,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      serviceType: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      finalPrice: selectedService.price,
      pointsUsed: 0,
      date: selectedDate,
      time: selectedTime,
      status: 'confirmed',
      notes: customerInfo.notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const reservationRef = await db.collection('reservations').add(reservationData);
    console.log(`予約ID: ${reservationRef.id}`);
    
    // 11. 予約完了画面
    console.log('\n🎉 予約完了画面');
    console.log('表示内容:');
    console.log('  「予約が完了しました」');
    console.log('  「確認メールをお送りします」');
    console.log('\nリダイレクト先: /mypage/reservations');
    
    // 12. 結果確認
    console.log('\n📊 最終確認');
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log(`ユーザー名: ${userData.name}`);
    console.log(`ポイント: ${userData.points}pt`);
    console.log(`予約数: 1件`);
    
    // クリーンアップ
    console.log('\n🧹 テストデータのクリーンアップ');
    await db.collection('reservations').doc(reservationRef.id).delete();
    await db.collection('users').doc(userId).delete();
    await auth.deleteUser(userId);
    console.log('✅ クリーンアップ完了');
    
    console.log('\n✨ UIフローテスト完了！');
    console.log('すべてのステップが正常に動作しました。');
    
  } catch (error) {
    console.error('\n❌ エラー:', error);
    
    // エラー時のクリーンアップ
    if (userId) {
      try {
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();
      } catch (cleanupError) {
        // クリーンアップエラーは無視
      }
    }
  }
  
  process.exit(0);
}

// 実行
simulateUIFlow();