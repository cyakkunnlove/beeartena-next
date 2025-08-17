require('dotenv').config({ path: '.env.local' })

const { initializeApp } = require('firebase/app')
const { getAuth } = require('firebase/auth')

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

console.log('Firebase Configuration Test')
console.log('==========================')
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...')
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)

try {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  console.log('✅ Firebase initialized successfully')
  console.log('Auth instance created:', !!auth)
  console.log('Current user:', auth.currentUser)
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message)
  console.error('Error code:', error.code)
}