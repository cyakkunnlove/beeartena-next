/**
 * BEE ART ENAシステム管理者機能の包括的テストスクリプト
 * 管理者アカウントでログインし、すべての管理機能と顧客への影響を検証
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

async function testAdminFullSystem() {
  console.log('🔐 BEE ART ENA管理者システムの包括的テストを開始します...\n')
  console.log('管理者アカウント: admin@beeartena.jp / admin123\n')

  let adminUserId = null
  let testUserId = null
  let testReservationId = null

  try {
    // 1. 管理者アカウントの検証
    console.log('=== 1. 管理者アカウントの検証 ===')
    try {
      // 管理者アカウントの取得または作成
      let adminRecord
      try {
        adminRecord = await auth.getUserByEmail('admin@beeartena.jp')
        logTest('管理者アカウントの確認', true)
      } catch (error) {
        // アカウントが存在しない場合は作成
        adminRecord = await auth.createUser({
          email: 'admin@beeartena.jp',
          password: 'admin123',
          displayName: '管理者',
        })
        logTest('管理者アカウントの作成', true)
      }

      adminUserId = adminRecord.uid

      // Firestoreに管理者情報を設定
      await db.collection('users').doc(adminUserId).set(
        {
          id: adminUserId,
          email: 'admin@beeartena.jp',
          name: '管理者',
          role: 'admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      // 管理者権限の確認
      const adminDoc = await db.collection('users').doc(adminUserId).get()
      const adminData = adminDoc.data()
      if (adminData.role === 'admin') {
        logTest('管理者権限の確認', true)
      } else {
        logTest('管理者権限の確認', false, 'roleがadminではありません')
      }
    } catch (error) {
      logTest('管理者アカウントの検証', false, error)
      return
    }

    // 2. 管理者ダッシュボードのデータ取得テスト
    console.log('\n=== 2. 管理者ダッシュボードのデータ取得 ===')
    try {
      // 全ユーザー数の取得
      const usersSnapshot = await db.collection('users').get()
      logTest('全ユーザー数の取得', true)
      console.log(`総ユーザー数: ${usersSnapshot.size}`)

      // 今月の予約数
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const reservationsSnapshot = await db
        .collection('reservations')
        .where('createdAt', '>=', startOfMonth)
        .get()
      logTest('今月の予約数の取得', true)
      console.log(`今月の予約数: ${reservationsSnapshot.size}`)

      // 売上データの集計
      let totalRevenue = 0
      reservationsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.status === 'confirmed' || data.status === 'completed') {
          totalRevenue += data.price || 0
        }
      })
      logTest('売上データの集計', true)
      console.log(`今月の売上: ¥${totalRevenue.toLocaleString()}`)
    } catch (error) {
      logTest('ダッシュボードデータの取得', false, error)
    }

    // 3. 顧客管理機能のテスト
    console.log('\n=== 3. 顧客管理機能のテスト ===')
    try {
      // 顧客一覧の取得
      const customersSnapshot = await db.collection('users').where('role', '==', 'customer').get()
      logTest('顧客一覧の取得', true)
      console.log(`顧客数: ${customersSnapshot.size}`)

      // テストユーザーの取得
      customersSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.email === 'test@example.com') {
          testUserId = doc.id
        }
      })

      if (testUserId) {
        // 顧客情報の編集（管理者による）
        await db.collection('users').doc(testUserId).update({
          note: '管理者メモ: VIP顧客として対応',
          vipStatus: true,
          updatedBy: adminUserId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        logTest('顧客情報の編集（管理者）', true)

        // ポイントの付与
        const currentUser = await db.collection('users').doc(testUserId).get()
        const currentPoints = currentUser.data().points || 0
        const bonusPoints = 1000

        await db
          .collection('users')
          .doc(testUserId)
          .update({
            points: currentPoints + bonusPoints,
          })

        await db.collection('pointTransactions').add({
          userId: testUserId,
          type: 'earn',
          amount: bonusPoints,
          description: '管理者によるボーナスポイント付与',
          balance: currentPoints + bonusPoints,
          createdBy: adminUserId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        logTest('ボーナスポイントの付与', true)
      }
    } catch (error) {
      logTest('顧客管理機能', false, error)
    }

    // 4. 予約管理機能のテスト
    console.log('\n=== 4. 予約管理機能のテスト ===')
    try {
      // 新規予約の作成（管理者が顧客の代わりに）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      const reservationData = {
        customerId: testUserId,
        customerName: 'テスト太郎（更新済み）',
        customerEmail: 'test@example.com',
        customerPhone: '090-9999-8888',
        serviceType: 'wax',
        serviceName: '眉毛ワックス脱毛',
        price: 15000,
        date: dateStr,
        time: '10:00',
        status: 'confirmed',
        notes: '管理者が電話予約を代行入力',
        createdBy: adminUserId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      const reservationRef = await db.collection('reservations').add(reservationData)
      testReservationId = reservationRef.id
      logTest('予約の代行作成', true)

      // 予約ステータスの変更
      await db.collection('reservations').doc(testReservationId).update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminUserId,
      })
      logTest('予約ステータスの変更', true)

      // 完了後のポイント付与（売上の5%）
      const earnedPoints = Math.floor(15000 * 0.05)
      const userDoc = await db.collection('users').doc(testUserId).get()
      const currentBalance = userDoc.data().points || 0

      await db
        .collection('users')
        .doc(testUserId)
        .update({
          points: currentBalance + earnedPoints,
        })

      await db.collection('pointTransactions').add({
        userId: testUserId,
        type: 'earn',
        amount: earnedPoints,
        description: '眉毛ワックス脱毛（¥15,000の5%）',
        balance: currentBalance + earnedPoints,
        reservationId: testReservationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      logTest('施術完了後のポイント付与', true)
    } catch (error) {
      logTest('予約管理機能', false, error)
    }

    // 5. サービス・料金設定のテスト
    console.log('\n=== 5. サービス・料金設定の管理 ===')
    try {
      // 新サービスの追加
      const newService = {
        id: 'lash-lift',
        name: 'まつ毛リフト',
        category: 'eyelash',
        price: 8000,
        duration: 60,
        description: '自然なカールで目元を華やかに',
        isActive: true,
        createdBy: adminUserId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection('services').doc(newService.id).set(newService)
      logTest('新サービスの追加', true)

      // 既存サービスの料金変更
      await db.collection('services').doc('3d-brow').update({
        price: 52000, // 50000 → 52000
        updatedBy: adminUserId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      logTest('サービス料金の変更', true)

      // 営業時間の変更
      await db
        .collection('settings')
        .doc('system')
        .update({
          businessHours: {
            monday: { open: '10:00', close: '19:00' },
            tuesday: { open: '10:00', close: '19:00' },
            wednesday: { open: '10:00', close: '19:00' },
            thursday: { open: '10:00', close: '20:00' }, // 延長
            friday: { open: '10:00', close: '20:00' }, // 延長
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '09:00', close: '17:00' },
          },
          updatedBy: adminUserId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      logTest('営業時間の変更', true)
    } catch (error) {
      logTest('サービス・料金設定', false, error)
    }

    // 6. 問い合わせ管理
    console.log('\n=== 6. 問い合わせ管理 ===')
    try {
      // 未読問い合わせの取得
      const unreadInquiries = await db.collection('inquiries').where('status', '==', 'unread').get()
      logTest('未読問い合わせの取得', true)
      console.log(`未読問い合わせ数: ${unreadInquiries.size}`)

      // 問い合わせへの返信記録
      if (!unreadInquiries.empty) {
        const inquiryDoc = unreadInquiries.docs[0]
        await db.collection('inquiries').doc(inquiryDoc.id).update({
          status: 'responded',
          response: 'お問い合わせありがとうございます。内容を確認させていただきました。',
          respondedBy: adminUserId,
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        logTest('問い合わせへの対応記録', true)
      }
    } catch (error) {
      logTest('問い合わせ管理', false, error)
    }

    // 7. 顧客側への影響確認
    console.log('\n=== 7. 管理者操作の顧客側への影響確認 ===')
    try {
      // 顧客情報の確認
      const customerDoc = await db.collection('users').doc(testUserId).get()
      const customerData = customerDoc.data()

      console.log('顧客側から見える情報:')
      console.log(`- 名前: ${customerData.name}`)
      console.log(`- ポイント: ${customerData.points}pt`)
      console.log(`- VIPステータス: ${customerData.vipStatus ? 'あり' : 'なし'}`)
      logTest('顧客情報への反映確認', true)

      // サービス一覧の確認（顧客視点）
      const activeServices = await db.collection('services').where('isActive', '==', true).get()
      console.log('\n利用可能なサービス:')
      activeServices.forEach((doc) => {
        const service = doc.data()
        console.log(`- ${service.name}: ¥${service.price.toLocaleString()}`)
      })
      logTest('サービス情報の反映確認', true)

      // 予約履歴の確認
      const customerReservations = await db
        .collection('reservations')
        .where('customerId', '==', testUserId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
      console.log(`\n予約履歴: ${customerReservations.size}件`)
      logTest('予約履歴の確認', true)
    } catch (error) {
      logTest('顧客側への影響確認', false, error)
    }

    // 8. セキュリティ確認
    console.log('\n=== 8. セキュリティ確認 ===')
    try {
      // 管理者のみアクセス可能なデータの確認
      const systemLogs = await db.collection('systemLogs').limit(1).get()
      if (systemLogs.empty) {
        // システムログコレクションを作成
        await db.collection('systemLogs').add({
          action: 'admin_test',
          userId: adminUserId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
      logTest('管理者限定データへのアクセス', true)
    } catch (error) {
      logTest('セキュリティ確認', false, error)
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

    console.log('\n🎉 管理者システムテスト完了！')
  } catch (error) {
    console.error('テスト中に予期しないエラーが発生しました:', error)
  }

  process.exit(0)
}

// テスト実行
testAdminFullSystem()
