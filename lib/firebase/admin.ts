import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // 開発環境ではサービスアカウントキーを使用
    if (process.env.NODE_ENV === 'development') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require('../../scripts/firebase-service-account-key.json')
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
      } catch (error) {
        console.error('Service account key not found, using environment variables')
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        })
      }
    } else {
      // 本番環境では環境変数から認証情報を取得
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error)
  }
}

// Firestore設定の最適化
admin.firestore().settings({
  // 接続プーリングの最適化
  maxIdleChannels: 10, // アイドル時のチャンネル数を増やす
  grpcChannelOptions: {
    // キープアライブ設定で接続を維持
    'grpc.keepalive_time_ms': 30000,
    'grpc.keepalive_timeout_ms': 10000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.http2.max_pings_without_data': 0,
    // 接続の再利用を促進
    'grpc.http2.min_time_between_pings_ms': 10000,
  }
})

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
export const adminStorage = admin.storage()

export default admin
