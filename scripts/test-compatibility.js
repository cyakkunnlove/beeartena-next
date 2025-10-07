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

// Simulate the default intake form creation (from frontend code)
function createDefaultIntakeForm() {
  return {
    allergies: { selections: [], details: '' },
    skinConcerns: { selections: [], details: '' },
    pregnancyStatus: 'none',
    infectionHistory: { selections: [], other: '' },
    mentalState: 'stable',
    goals: { selections: [], other: '' },
    medications: { selections: [], other: '' },
  };
}

async function testCompatibility() {
  try {
    console.log('=== TESTING LEGACY RESERVATION COMPATIBILITY ===\n');

    // Get a legacy reservation (without intakeForm)
    const legacySnapshot = await db.collection('reservations')
      .where('intakeForm', '==', null)
      .limit(1)
      .get();

    if (legacySnapshot.empty) {
      console.log('⚠️  No legacy reservations found. Creating one...');

      const legacyReservation = {
        customerId: 'legacy-user-001',
        customerName: 'レガシーユーザー',
        customerEmail: 'legacy@example.com',
        customerPhone: '090-8888-8888',
        serviceType: '2D',
        serviceName: '2Dパウダーブロウ（レガシー）',
        price: 20000,
        totalPrice: 20000,
        finalPrice: 20000,
        date: '2025-10-20',
        time: '11:00',
        status: 'confirmed',
        notes: 'intakeFormフィールドを持たない旧形式の予約',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection('reservations').add(legacyReservation);
      console.log('✅ Legacy reservation created:', docRef.id);
      console.log('');
    }

    // Get all reservations (both legacy and with intakeForm)
    const allReservations = await db.collection('reservations')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    console.log('=== PROCESSING ALL RESERVATIONS ===');
    console.log('Total:', allReservations.size);
    console.log('');

    let withIntakeForm = 0;
    let withoutIntakeForm = 0;
    let errors = 0;

    allReservations.forEach((doc) => {
      const data = doc.data();
      const hasIntakeForm = !!data.intakeForm;

      try {
        // Simulate frontend processing
        const processedIntakeForm = data.intakeForm ?? createDefaultIntakeForm();

        if (hasIntakeForm) {
          withIntakeForm++;
          console.log(`✅ [WITH] ${data.customerName} - intakeForm exists`);
        } else {
          withoutIntakeForm++;
          console.log(`⚪ [LEGACY] ${data.customerName} - using default intakeForm`);
        }

        // Verify all required fields exist
        const requiredFields = ['allergies', 'skinConcerns', 'pregnancyStatus', 'infectionHistory', 'mentalState', 'goals', 'medications'];
        const missingFields = requiredFields.filter(field => !processedIntakeForm[field]);

        if (missingFields.length > 0) {
          console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
          errors++;
        }
      } catch (error) {
        console.log(`   ❌ ERROR processing ${data.customerName}: ${error.message}`);
        errors++;
      }
    });

    console.log('');
    console.log('=== COMPATIBILITY TEST RESULTS ===');
    console.log('✅ Reservations with intakeForm:', withIntakeForm);
    console.log('⚪ Legacy reservations (auto-filled):', withoutIntakeForm);
    console.log('❌ Errors:', errors);
    console.log('');

    if (errors === 0) {
      console.log('🎉 SUCCESS: All reservations are compatible!');
      console.log('   - New reservations store intakeForm data');
      console.log('   - Legacy reservations use default values');
      console.log('   - No migration required');
    } else {
      console.log('⚠️  ATTENTION: Some compatibility issues found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in compatibility test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCompatibility();
