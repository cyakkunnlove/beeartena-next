import { getAdminDb } from '@/lib/firebase/admin'
import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

export type AdminAuditEventInput = {
  actorUserId: string
  actorEmail?: string
  actorRole: string
  method: string
  path: string
  query?: Record<string, string>
  ip?: string
  userAgent?: string
  requestId?: string
}

export type AdminAuditLogRecord = AdminAuditEventInput & {
  createdAt: Date
  vercelEnv?: string
}

const COLLECTION = 'admin_audit_logs'

export async function recordAdminAuditEvent(input: AdminAuditEventInput): Promise<void> {
  try {
    const db = getAdminDb()
    if (!db) {
      return
    }

    const record: AdminAuditLogRecord = {
      ...input,
      createdAt: new Date(),
      vercelEnv: process.env.VERCEL_ENV,
    }

    await db.collection(COLLECTION).add(record)
  } catch (error) {
    logger.warn('Failed to write admin audit log', { error: getErrorMessage(error) })
  }
}

