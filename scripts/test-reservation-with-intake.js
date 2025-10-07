const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestReservation() {
  try {
    console.log('=== CREATING TEST RESERVATION WITH INTAKE FORM ===\n');

    const testReservation = {
      customerId: 'test-user-001',
      customerName: 'テストユーザー（問診票確認用）',
      customerEmail: 'test@example.com',
      customerPhone: '090-9999-9999',
      serviceType: '4D',
      serviceName: '4Dパウダー&フェザー（テスト）',
      price: 25000,
      totalPrice: 25000,
      finalPrice: 25000,
      date: '2025-10-15',
      time: '14:00',
      status: 'pending',
      notes: 'これは問診票フィールドのテスト予約です',
      isMonitor: false,
      pointsUsed: 0,
      intakeForm: {
        allergies: {
          selections: ['金属アレルギー', '薬物アレルギー'],
          details: 'ニッケルに対してアレルギー反応があります'
        },
        skinConcerns: {
          selections: ['乾燥肌', '敏感肌'],
          details: '冬場は特に乾燥が気になります'
        },
        pregnancyStatus: 'none',
        infectionHistory: {
          selections: ['なし'],
          other: ''
        },
        mentalState: 'stable',
        goals: {
          selections: ['眉毛の形を整えたい', '時短メイクをしたい'],
          other: ''
        },
        medications: {
          selections: ['なし'],
          other: ''
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('reservations').add(testReservation);
    console.log('✅ Test reservation created successfully!');
    console.log('   Document ID:', docRef.id);
    console.log('');

    // Verify the created document
    const doc = await docRef.get();
    const data = doc.data();

    console.log('=== VERIFICATION ===');
    console.log('Customer Name:', data.customerName);
    console.log('Service:', data.serviceName);
    console.log('Date/Time:', data.date, data.time);
    console.log('');
    console.log('✅ intakeForm field exists:', !!data.intakeForm);

    if (data.intakeForm) {
      console.log('');
      console.log('intakeForm contents:');
      console.log('  allergies:');
      console.log('    selections:', data.intakeForm.allergies.selections);
      console.log('    details:', data.intakeForm.allergies.details);
      console.log('  skinConcerns:');
      console.log('    selections:', data.intakeForm.skinConcerns.selections);
      console.log('    details:', data.intakeForm.skinConcerns.details);
      console.log('  pregnancyStatus:', data.intakeForm.pregnancyStatus);
      console.log('  infectionHistory:');
      console.log('    selections:', data.intakeForm.infectionHistory.selections);
      console.log('    other:', data.intakeForm.infectionHistory.other);
      console.log('  mentalState:', data.intakeForm.mentalState);
      console.log('  goals:');
      console.log('    selections:', data.intakeForm.goals.selections);
      console.log('    other:', data.intakeForm.goals.other);
      console.log('  medications:');
      console.log('    selections:', data.intakeForm.medications.selections);
      console.log('    other:', data.intakeForm.medications.other);

      console.log('');
      console.log('🎉 SUCCESS: intakeForm structure is correct!');
    } else {
      console.log('');
      console.log('❌ ERROR: intakeForm field was not saved');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test reservation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestReservation();
