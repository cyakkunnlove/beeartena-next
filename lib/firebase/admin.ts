import * as admin from 'firebase-admin'

import { logger } from '@/lib/utils/logger'

type ServiceAccount = admin.ServiceAccount & { project_id?: string }

let adminApp: admin.app.App | null = admin.apps.length ? admin.app() : null

if (!adminApp) {
  const normalizeBucketName = (raw: string) => {
    let value = raw.trim()
    if (!value) return ''
    value = value.replace(/^gs:\/\//, '')
    value = value.replace(/^https?:\/\/storage\.googleapis\.com\//, '')
    if (value.includes('/')) {
      value = value.split('/')[0] ?? ''
    }
    return value.trim()
  }

  const envProjectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim()
  const envClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim()
  const envPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  const envStorageBucket = (
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    ''
  )
  const normalizedStorageBucket = normalizeBucketName(envStorageBucket)

  let serviceAccount: ServiceAccount | null = null

  if (process.env.NODE_ENV === 'development') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const raw = require('../../scripts/firebase-service-account-key.json') as ServiceAccount & {
        project_id?: string
        client_email?: string
        private_key?: string
      }
      serviceAccount = {
        projectId: raw.projectId || raw.project_id,
        clientEmail: raw.clientEmail || raw.client_email,
        privateKey: raw.privateKey || raw.private_key,
      }
    } catch {
      logger.debug('Local service account file not found; falling back to environment variables')
    }
  }

  try {
    if (serviceAccount && serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId,
        ...(normalizedStorageBucket ? { storageBucket: normalizedStorageBucket } : {}),
      })
    } else if (envProjectId && envClientEmail && envPrivateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: envProjectId,
          clientEmail: envClientEmail,
          privateKey: envPrivateKey,
        }),
        projectId: envProjectId,
        ...(normalizedStorageBucket ? { storageBucket: normalizedStorageBucket } : {}),
      })
    } else if (envProjectId) {
      adminApp = admin.initializeApp({
        projectId: envProjectId,
        ...(normalizedStorageBucket ? { storageBucket: normalizedStorageBucket } : {}),
      })
      logger.warn('Firebase admin initialised without explicit credentials; ensure ADC is configured for production use')
    } else {
      logger.warn('Firebase admin credentials not provided; admin features will be disabled')
    }
  } catch (error) {
    logger.error('Firebase admin initialization error', { error })
    adminApp = null
  }
}

export const isAdminInitialized = adminApp !== null

if (isAdminInitialized) {
  try {
    admin.firestore().settings({
      maxIdleChannels: 10,
      grpcChannelOptions: {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 10000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
      },
    })
  } catch (error) {
    logger.warn('Failed to apply Firestore settings', { error })
  }
}

export function ensureAdminApp(): admin.app.App {
  if (!adminApp) {
    throw new Error('Firebase admin is not configured')
  }
  return adminApp
}

export function getAdminApp(): admin.app.App | null {
  return adminApp
}

export function getAdminAuth(): admin.auth.Auth | null {
  return adminApp ? adminApp.auth() : null
}

export function getAdminDb(): admin.firestore.Firestore | null {
  return adminApp ? adminApp.firestore() : null
}

export function getAdminStorage(): admin.storage.Storage | null {
  return adminApp ? adminApp.storage() : null
}

export default admin
