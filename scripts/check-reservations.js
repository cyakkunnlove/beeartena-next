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

async function checkReservations() {
  try {
    // Get the most recent reservations
    const snapshot = await db.collection('reservations')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    console.log('=== RESERVATION COLLECTION CHECK ===\n');
    console.log('Total reservations found:', snapshot.size);
    console.log('');

    if (snapshot.empty) {
      console.log('⚠️  No reservations found in database');
      return;
    }

    let hasIntakeForm = false;
    let noIntakeForm = false;

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Reservation #${index + 1} (ID: ${doc.id}):`);
      console.log('- customerName:', data.customerName);
      console.log('- serviceName:', data.serviceName);
      console.log('- date:', data.date);
      console.log('- time:', data.time);
      console.log('- createdAt:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('- intakeForm exists:', !!data.intakeForm);

      if (data.intakeForm) {
        hasIntakeForm = true;
        console.log('  ✅ intakeForm structure:');
        console.log('    - allergies:', JSON.stringify(data.intakeForm.allergies || 'missing'));
        console.log('    - skinConcerns:', JSON.stringify(data.intakeForm.skinConcerns || 'missing'));
        console.log('    - pregnancyStatus:', data.intakeForm.pregnancyStatus || 'missing');
        console.log('    - infectionHistory:', JSON.stringify(data.intakeForm.infectionHistory || 'missing'));
        console.log('    - mentalState:', data.intakeForm.mentalState || 'missing');
        console.log('    - goals:', JSON.stringify(data.intakeForm.goals || 'missing'));
        console.log('    - medications:', JSON.stringify(data.intakeForm.medications || 'missing'));
      } else {
        noIntakeForm = true;
        console.log('  ❌ intakeForm field does not exist (legacy reservation)');
      }
      console.log('');
    });

    console.log('=== SUMMARY ===');
    console.log('✅ Reservations with intakeForm:', hasIntakeForm ? 'YES' : 'NO');
    console.log('⚠️  Legacy reservations (no intakeForm):', noIntakeForm ? 'YES' : 'NO');

    process.exit(0);
  } catch (error) {
    console.error('Error checking reservations:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkReservations();
