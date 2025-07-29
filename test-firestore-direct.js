// Firestore直接アクセステスト
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'beeart-ena',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'firebase-adminsdk@beeart-ena.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId
  });
}

const db = admin.firestore();

async function testDirectFirestore() {
  console.log('Firestore直接テスト開始...');
  
  const reservationData = {
    serviceId: '2D',
    serviceType: '2D',
    serviceName: '2D眉毛',
    price: 30000,
    date: '2025-08-01',
    time: '18:30',
    customerName: 'テスト太郎',
    customerPhone: '090-1234-5678',
    customerEmail: 'test@example.com',
    customerId: null,
    notes: 'テスト予約',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection('reservations').add(reservationData);
    console.log('予約作成成功:', docRef.id);
    
    // 作成した予約を取得
    const doc = await docRef.get();
    console.log('作成された予約:', doc.data());
  } catch (error) {
    console.error('エラー:', error.message);
    console.error('詳細:', error);
  }
}

testDirectFirestore();