const admin = require('firebase-admin');

// 環境変数から認証情報を読み込み
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkAdmin() {
  try {
    // Firestoreのusersコレクションを確認
    const usersSnapshot = await db.collection('users').get();

    console.log(`\n=== Firestore Users (${usersSnapshot.size} users) ===`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nUser ID: ${doc.id}`);
      console.log(`  Email: ${data.email || 'N/A'}`);
      console.log(`  Name: ${data.name || 'N/A'}`);
      console.log(`  Role: ${data.role || 'user'}`);
    });

    // sm383838@gmail.com を探す
    const adminQuery = await db.collection('users')
      .where('email', '==', 'sm383838@gmail.com')
      .get();

    console.log(`\n=== Admin User (sm383838@gmail.com) ===`);
    if (adminQuery.empty) {
      console.log('❌ Admin user not found in Firestore');
      console.log('\n💡 Solution: Create admin user in Firestore:');
      console.log('   - Email: sm383838@gmail.com');
      console.log('   - Role: admin');
    } else {
      adminQuery.forEach(doc => {
        const data = doc.data();
        console.log('✅ Admin user found:');
        console.log(`   User ID: ${doc.id}`);
        console.log(`   Role: ${data.role}`);
        if (data.role !== 'admin') {
          console.log('   ⚠️  Role is not "admin" - needs to be updated!');
        }
      });
    }

    // Firebase Authentication users
    const listUsersResult = await admin.auth().listUsers(10);
    console.log(`\n=== Firebase Auth Users (showing ${listUsersResult.users.length}) ===`);
    listUsersResult.users.forEach(user => {
      console.log(`\n${user.email || 'No email'}`);
      console.log(`  UID: ${user.uid}`);
      console.log(`  Created: ${new Date(user.metadata.creationTime).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
