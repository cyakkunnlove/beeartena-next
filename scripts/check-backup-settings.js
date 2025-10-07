const admin = require('firebase-admin');
const { google } = require('googleapis');
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

async function checkBackupSettings() {
  try {
    console.log('=== FIREBASE BACKUP SETTINGS CHECK ===\n');
    console.log('Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID);
    console.log('');

    // Note: Firebase Admin SDK doesn't provide direct access to backup settings
    // These need to be checked through Firebase Console or GCP Console

    console.log('📋 Manual Check Required:');
    console.log('');
    console.log('1. Firestore Automatic Backups:');
    console.log('   URL: https://console.firebase.google.com/project/beeart-ena/firestore/backups');
    console.log('   Check: Backup schedule and retention period');
    console.log('');
    console.log('2. GCP Console - Firestore Backups:');
    console.log('   URL: https://console.cloud.google.com/firestore/backups?project=beeart-ena');
    console.log('   Check: Automated backup policies');
    console.log('');
    console.log('3. BigQuery Export (Optional):');
    console.log('   URL: https://console.firebase.google.com/project/beeart-ena/firestore/export-import');
    console.log('   Check: BigQuery streaming or batch export settings');
    console.log('');
    console.log('4. Audit Logs:');
    console.log('   URL: https://console.cloud.google.com/iam-admin/audit?project=beeart-ena');
    console.log('   Check: Cloud Firestore API audit logs enabled');
    console.log('');

    // Get some basic project info
    const db = admin.firestore();
    const collections = await db.listCollections();

    console.log('📊 Current Firestore State:');
    console.log('   Collections:', collections.map(c => c.id).join(', '));
    console.log('');

    // Get collection document counts
    console.log('📈 Document Counts:');
    for (const collection of collections) {
      const snapshot = await collection.count().get();
      console.log(`   - ${collection.id}: ${snapshot.data().count} documents`);
    }
    console.log('');

    console.log('✅ RECOMMENDATIONS:');
    console.log('');
    console.log('1. Enable Daily Automatic Backups:');
    console.log('   - Retention: At least 7 days');
    console.log('   - Location: Same region as Firestore database');
    console.log('');
    console.log('2. Enable Audit Logs:');
    console.log('   - Admin Read: Enabled');
    console.log('   - Data Read: Enabled (for security monitoring)');
    console.log('   - Data Write: Enabled (for compliance)');
    console.log('');
    console.log('3. Consider BigQuery Export:');
    console.log('   - For analytics and long-term archival');
    console.log('   - Especially useful for intakeForm data analysis');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking backup settings:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkBackupSettings();
