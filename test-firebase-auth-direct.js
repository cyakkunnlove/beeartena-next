const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testFirebaseAuthDirect() {
  try {
    console.log('=== Direct Firebase Auth Test ===');
    
    const { initializeApp, getApps } = require('firebase/app');
    const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim(),
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim(),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.trim(),
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.trim(),
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID.trim(),
    };
    
    console.log('Using config:', firebaseConfig);
    
    // Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);
    
    console.log('Firebase initialized, attempting user creation...');
    
    // Generate unique email
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Creating user with email: ${testEmail}`);
    
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User created successfully!');
    console.log('User UID:', userCredential.user.uid);
    console.log('User email:', userCredential.user.email);
    
    // Clean up - delete the test user
    await userCredential.user.delete();
    console.log('✅ Test user deleted successfully');
    
  } catch (error) {
    console.error('❌ Firebase Auth test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    
    // Check specific error codes
    if (error.code === 'auth/api-key-not-valid') {
      console.error('\n🔍 API Key Validation Failed!');
      console.error('This could mean:');
      console.error('1. The API key is incorrect');
      console.error('2. The API key is not enabled for this domain');
      console.error('3. The API key restrictions are too strict');
      console.error('4. The Firebase project configuration is incorrect');
    }
    
    if (error.code === 'auth/project-not-found') {
      console.error('\n🔍 Project Not Found!');
      console.error('Check if the project ID is correct:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    }
  }
}

testFirebaseAuthDirect();