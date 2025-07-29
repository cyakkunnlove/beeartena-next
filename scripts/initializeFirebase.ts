import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase/config'

/**
 * Firebaseの初期設定を行うスクリプト
 * 注意: このスクリプトは管理者権限で実行する必要があります
 */

async function initializeFirebase() {
  try {
    console.log('Firebase初期化を開始します...')

    // 1. 予約設定の初期化
    console.log('予約設定を初期化中...')
    await setDoc(doc(db, 'settings', 'reservation_settings'), {
      slotDuration: 120,
      maxCapacityPerSlot: 1,
      businessHours: [
        { dayOfWeek: 0, open: '', close: '', isOpen: false }, // 日曜
        { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true }, // 月曜
        { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true }, // 火曜
        { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true }, // 水曜
        { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true }, // 木曜
        { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true }, // 金曜
        { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true }, // 土曜
      ],
      blockedDates: [],
      updatedAt: serverTimestamp(),
    })
    console.log('✅ 予約設定を初期化しました')

    // 2. サンプルデータの作成（オプション）
    const createSampleData = process.argv.includes('--sample')
    if (createSampleData) {
      console.log('サンプルデータを作成中...')
      
      // サンプル顧客
      const sampleCustomerId = 'sample-customer-1'
      await setDoc(doc(db, 'users', sampleCustomerId), {
        email: 'sample@example.com',
        name: 'サンプル 太郎',
        phone: '090-1234-5678',
        role: 'customer',
        points: 1000,
        totalSpent: 70000,
        birthday: '1990-05-15',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      
      // サンプル予約
      await setDoc(doc(db, 'reservations', 'sample-reservation-1'), {
        customerId: sampleCustomerId,
        customerName: 'サンプル 太郎',
        customerEmail: 'sample@example.com',
        customerPhone: '090-1234-5678',
        serviceType: '4D',
        serviceName: '4Dパウダー&フェザー',
        price: 70000,
        date: new Date().toISOString().split('T')[0],
        time: '18:30',
        status: 'confirmed',
        notes: 'サンプル予約です',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      
      // サンプルポイント履歴
      await setDoc(doc(db, 'points', 'sample-point-1'), {
        userId: sampleCustomerId,
        amount: 1000,
        type: 'earned',
        reason: '新規登録ボーナス',
        createdAt: serverTimestamp(),
      })
      
      console.log('✅ サンプルデータを作成しました')
    }

    console.log('\n🎉 Firebase初期化が完了しました！')
    console.log('\n次のステップ:')
    console.log('1. Firebase Consoleでセキュリティルールを設定してください')
    console.log('2. 管理者ユーザーを作成してください')
    console.log('3. .env.localファイルに環境変数を設定してください')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
initializeFirebase().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})