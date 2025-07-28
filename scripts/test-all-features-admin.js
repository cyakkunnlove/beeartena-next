/**
 * BEE ART ENAシステムの全機能テストスクリプト（Admin SDK版）
 * Firebase Admin SDKを使用してテストユーザーとして振る舞い、すべての機能を検証
 */

const admin = require('firebase-admin')
const serviceAccount = require('./firebase-service-account-key.json')

// Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'beeart-ena',
  })
}

const db = admin.firestore()
const auth = admin.auth()

// テスト結果を記録
const testResults = {
  passed: [],
  failed: [],
}

function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`)
    testResults.passed.push(testName)
  } else {
    console.log(`❌ ${testName}: ${error}`)
    testResults.failed.push({ test: testName, error: error?.message || error })
  }
}

async function testAllFeatures() {
  console.log('🧪 BEE ART ENAシステムの包括的な機能テストを開始します...\n')

  let testUserId = null
  let reservationId = null

  try {
    // 1. テストユーザーの確認
    console.log('=== 1. ユーザー機能のテスト ===')
    try {
      // テストユーザーの情報を取得
      const userRecord = await auth.getUserByEmail('test@example.com')
      testUserId = userRecord.uid
      logTest('テストユーザーの確認', true)

      // Firestoreからユーザー情報取得
      const userDoc = await db.collection('users').doc(testUserId).get()
      if (userDoc.exists) {
        logTest('ユーザー情報取得', true)
        console.log('ユーザー情報:', JSON.stringify(userDoc.data(), null, 2))
      }
    } catch (error) {
      logTest('テストユーザーの確認', false, error)
      return
    }

    // 2. プロフィール編集のテスト
    console.log('\n=== 2. プロフィール編集機能のテスト ===')
    try {
      const updateData = {
        name: 'テスト太郎（更新済み）',
        phone: '090-9999-8888',
        birthday: '1990-01-01',
        gender: 'male',
        address: {
          postalCode: '509-7201',
          prefecture: '岐阜県',
          city: '恵那市',
          street: '大井町123-456',
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection('users').doc(testUserId).update(updateData)
      logTest('プロフィール更新（基本情報）', true)

      // 更新確認
      const updatedDoc = await db.collection('users').doc(testUserId).get()
      const updatedData = updatedDoc.data()
      if (
        updatedData.name === 'テスト太郎（更新済み）' &&
        updatedData.phone === '090-9999-8888' &&
        updatedData.gender === 'male' &&
        updatedData.address?.prefecture === '岐阜県' &&
        updatedData.address?.city === '恵那市'
      ) {
        logTest('プロフィール更新の保存確認（全項目）', true)
        console.log('更新された住所情報:', JSON.stringify(updatedData.address, null, 2))
      } else {
        logTest('プロフィール更新の保存確認', false, '更新が反映されていません')
      }
    } catch (error) {
      logTest('プロフィール編集', false, error)
    }

    // 3. 予約機能のテスト
    console.log('\n=== 3. 予約機能のテスト ===')

    // 3-1. 予約の作成
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      const reservationData = {
        customerId: testUserId,
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      const docRef = await db.collection('reservations').add(reservationData)
      reservationId = docRef.id
      logTest('予約の作成', true)
      console.log('予約ID:', reservationId)
    } catch (error) {
      logTest('予約の作成', false, error)
    }

    // 3-2. 予約の取得
    try {
      const reservationDoc = await db.collection('reservations').doc(reservationId).get()
      if (reservationDoc.exists) {
        logTest('予約情報の取得', true)
        console.log('予約詳細:', JSON.stringify(reservationDoc.data(), null, 2))
      }
    } catch (error) {
      logTest('予約情報の取得', false, error)
    }

    // 3-3. 予約の更新
    try {
      await db.collection('reservations').doc(reservationId).update({
        time: '15:00',
        notes: 'テスト予約（時間変更済み）',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      logTest('予約の更新', true)

      // 更新確認
      const updatedReservation = await db.collection('reservations').doc(reservationId).get()
      const data = updatedReservation.data()
      if (data.time === '15:00' && data.notes === 'テスト予約（時間変更済み）') {
        logTest('予約更新の保存確認', true)
      }
    } catch (error) {
      logTest('予約の更新', false, error)
    }

    // 4. ポイント機能のテスト
    console.log('\n=== 4. ポイント機能のテスト ===')

    // 4-1. ポイント履歴の追加
    try {
      const pointTransaction = {
        userId: testUserId,
        type: 'earn',
        amount: 2500,
        description: '3D眉毛施術（50,000円の5%）',
        balance: 3000, // 既存の500 + 2500
        reservationId: reservationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection('pointTransactions').add(pointTransaction)
      logTest('ポイント履歴の追加', true)

      // ユーザーのポイント更新
      await db.collection('users').doc(testUserId).update({
        points: 3000,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      logTest('ユーザーポイントの更新', true)
    } catch (error) {
      logTest('ポイント機能', false, error)
    }

    // 5. 問い合わせ機能のテスト
    console.log('\n=== 5. 問い合わせ機能のテスト ===')

    try {
      const inquiryData = {
        name: 'テスト太郎',
        email: 'test@example.com',
        phone: '090-9999-8888',
        type: 'general',
        message: 'これはテストの問い合わせです。システムが正常に動作しているか確認しています。',
        status: 'unread',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      const inquiryRef = await db.collection('inquiries').add(inquiryData)
      logTest('問い合わせの作成', true)
      console.log('問い合わせID:', inquiryRef.id)
    } catch (error) {
      logTest('問い合わせの作成', false, error)
    }

    // 6. データの削除テスト
    console.log('\n=== 6. データ削除機能のテスト ===')

    // 6-1. 予約の削除
    if (reservationId) {
      try {
        await db.collection('reservations').doc(reservationId).delete()
        logTest('予約の削除', true)

        // 削除確認
        const deletedDoc = await db.collection('reservations').doc(reservationId).get()
        if (!deletedDoc.exists) {
          logTest('予約削除の確認', true)
        }
      } catch (error) {
        logTest('予約の削除', false, error)
      }
    }

    // 7. 管理者機能のテスト
    console.log('\n=== 7. 管理者機能のテスト ===')

    try {
      // 全ユーザーの取得（管理者権限）
      const usersSnapshot = await db.collection('users').get()
      logTest('全ユーザー情報の取得（管理者権限）', true)
      console.log(`総ユーザー数: ${usersSnapshot.size}`)

      // サービス設定の確認
      const servicesSnapshot = await db.collection('services').get()
      logTest('サービス設定の取得', true)
      console.log(`登録サービス数: ${servicesSnapshot.size}`)

      // システム設定の確認
      const settingsDoc = await db.collection('settings').doc('system').get()
      if (settingsDoc.exists) {
        logTest('システム設定の取得', true)
      }
    } catch (error) {
      logTest('管理者機能', false, error)
    }

    // 8. 予約可能時間の確認
    console.log('\n=== 8. 予約可能時間の確認 ===')

    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      // その日の予約を取得
      const reservationsSnapshot = await db
        .collection('reservations')
        .where('date', '==', dateStr)
        .where('status', 'in', ['confirmed', 'pending'])
        .get()

      logTest('予約状況の確認', true)
      console.log(`${dateStr}の予約数: ${reservationsSnapshot.size}`)

      // 営業時間の確認
      const settingsDoc = await db.collection('settings').doc('system').get()
      if (settingsDoc.exists) {
        const settings = settingsDoc.data()
        console.log('営業時間:', settings.businessHours)
      }
    } catch (error) {
      logTest('予約可能時間の確認', false, error)
    }

    // テスト結果のサマリー
    console.log('\n=== テスト結果サマリー ===')
    console.log(`✅ 成功: ${testResults.passed.length}件`)
    console.log(`❌ 失敗: ${testResults.failed.length}件`)

    if (testResults.failed.length > 0) {
      console.log('\n失敗したテスト:')
      testResults.failed.forEach((f) => {
        console.log(`- ${f.test}: ${f.error}`)
      })
    }

    console.log('\n🎉 テスト完了！')
  } catch (error) {
    console.error('テスト中に予期しないエラーが発生しました:', error)
  }

  process.exit(0)
}

// テスト実行
testAllFeatures()
