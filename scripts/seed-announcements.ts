import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

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

// サンプルお知らせデータ（必要に応じて編集）
const sampleAnnouncements = [
  {
    id: 'announcement-welcome',
    title: 'サービス開始のお知らせ',
    body: 'この度、まつ毛エクステンション予約システムをリニューアルいたしました。オンラインで簡単にご予約いただけます。',
    publishAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
    isPinned: true,
    priority: 100,
  },
  {
    id: 'announcement-campaign',
    title: '新規会員様限定キャンペーン',
    body: '初回ご利用の方は、全メニュー20%OFF！この機会にぜひお試しください。',
    publishAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60日後
    isPinned: false,
    priority: 90,
  },
]

async function seedAnnouncements() {
  console.log('Starting announcements seeding...')

  const batch = db.batch()
  const now = Timestamp.now()

  for (const announcement of sampleAnnouncements) {
    const docRef = db.collection('announcements').doc(announcement.id)

    // 既存データをチェック
    const existingDoc = await docRef.get()
    if (existingDoc.exists) {
      console.log(`Announcement '${announcement.id}' already exists. Skipping...`)
      continue
    }

    const data = {
      ...announcement,
      createdAt: now,
      updatedAt: now,
    }

    batch.set(docRef, data)
    console.log(`Adding announcement: ${announcement.id} - ${announcement.title}`)
  }

  await batch.commit()
  console.log('Announcements seeding completed!')
}

// スクリプト実行
seedAnnouncements()
  .then(() => {
    console.log('Success!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error seeding announcements:', error)
    process.exit(1)
  })
