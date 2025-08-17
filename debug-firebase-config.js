const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('=== Firebase Environment Variables Debug ===');

const firebaseVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

Object.entries(firebaseVars).forEach(([key, value]) => {
  console.log(`${key}:`);
  if (value) {
    console.log(`  Length: ${value.length}`);
    console.log(`  First 10 chars: ${value.substring(0, 10)}...`);
    console.log(`  Last 10 chars: ...${value.substring(value.length - 10)}`);
    console.log(`  Contains newlines: ${value.includes('\n')}`);
    console.log(`  Contains carriage returns: ${value.includes('\r')}`);
    console.log(`  First char code: ${value.charCodeAt(0)}`);
    console.log(`  Last char code: ${value.charCodeAt(value.length - 1)}`);
    console.log(`  Trimmed length: ${value.trim().length}`);
  } else {
    console.log('  NOT SET');
  }
  console.log('');
});

// Test Firebase initialization
console.log('=== Testing Firebase Initialization ===');
try {
  const firebase = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  
  const firebaseConfig = {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key').trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com').trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project').trim(),
    storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com').trim(),
    messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789').trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef').trim(),
  };
  
  console.log('Config object:');
  console.log(JSON.stringify(firebaseConfig, null, 2));
  
  // Check if any apps already exist
  const apps = firebase.getApps();
  console.log(`Existing Firebase apps: ${apps.length}`);
  
  // Try to initialize
  let app;
  if (apps.length === 0) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
  } else {
    app = apps[0];
    console.log('✅ Using existing Firebase app');
  }
  
  // Try to get auth
  const auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');
  console.log(`Auth app name: ${auth.app.name}`);
  console.log(`Auth app options: ${JSON.stringify(auth.app.options, null, 2)}`);
  
} catch (error) {
  console.error('❌ Firebase initialization failed:');
  console.error('Error message:', error.message);
  console.error('Error code:', error.code || 'N/A');
  console.error('Full error:', error);
}