import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { defaultServicePlans } from '../lib/firebase/servicePlans'

// Firebase Admin初期化
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId) {
    throw new Error('FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is required')
  }

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } else {
    // 環境変数が設定されていない場合は、デフォルト認証を使用
    initializeApp({ projectId })
  }
}

const db = getFirestore()

async function seedServicePlans() {
  console.log('Starting service plans seeding...')

  const batch = db.batch()
  const now = Timestamp.now()

  for (const plan of defaultServicePlans) {
    const docRef = db.collection('service-plans').doc(plan.id)

    // 既存データをチェック
    const existingDoc = await docRef.get()
    if (existingDoc.exists) {
      console.log(`Service plan '${plan.id}' already exists. Skipping...`)
      continue
    }

    const data = {
      ...plan,
      createdAt: now,
      updatedAt: now,
    }

    batch.set(docRef, data)
    console.log(`Adding service plan: ${plan.id} - ${plan.name}`)
  }

  await batch.commit()
  console.log('Service plans seeding completed!')
}

// スクリプト実行
seedServicePlans()
  .then(() => {
    console.log('Success!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error seeding service plans:', error)
    process.exit(1)
  })
