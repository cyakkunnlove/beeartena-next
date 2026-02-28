import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin, setCorsHeaders, verifyAuth } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'
import { recordAdminAuditEvent } from '@/lib/firebase/adminAudit'

const COLLECTION = 'service-plans'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'Firebase not configured' }, { status: 503 }))
  }

  try {
    const snapshot = await db.collection(COLLECTION).orderBy('displayOrder', 'asc').get()
    const plans = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
      }
    })
    return setCorsHeaders(NextResponse.json({ success: true, plans }))
  } catch (error) {
    return setCorsHeaders(NextResponse.json({ success: false, message: String(error) }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'Firebase not configured' }, { status: 503 }))
  }

  try {
    const authUser = await verifyAuth(request)
    const payload = await request.json()
    const now = new Date()
    const docRef = db.collection(COLLECTION).doc()
    await docRef.set({ ...payload, createdAt: now, updatedAt: now })

    const snap = await docRef.get()
    const created = { ...snap.data(), id: docRef.id }

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: 'POST',
        path: '/api/admin/service-plans',
        action: 'service-plan.create',
        resourceType: COLLECTION,
        resourceId: docRef.id,
        status: 'success',
      })
    }

    return setCorsHeaders(NextResponse.json({ success: true, plan: created }))
  } catch (error) {
    return setCorsHeaders(NextResponse.json({ success: false, message: String(error) }, { status: 500 }))
  }
}

export async function PATCH(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 }))
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'Firebase not configured' }, { status: 503 }))
  }

  try {
    const authUser = await verifyAuth(request)
    const payload = await request.json()
    const now = new Date()

    await db.collection(COLLECTION).doc(id).set({ ...payload, updatedAt: now }, { merge: true })

    const snap = await db.collection(COLLECTION).doc(id).get()
    const updated = { ...snap.data(), id: snap.id }

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: 'PATCH',
        path: '/api/admin/service-plans',
        action: 'service-plan.update',
        resourceType: COLLECTION,
        resourceId: id,
        status: 'success',
      })
    }

    return setCorsHeaders(NextResponse.json({ success: true, plan: updated }))
  } catch (error) {
    return setCorsHeaders(NextResponse.json({ success: false, message: String(error) }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 }))
  }

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(NextResponse.json({ success: false, message: 'Firebase not configured' }, { status: 503 }))
  }

  try {
    const authUser = await verifyAuth(request)
    await db.collection(COLLECTION).doc(id).delete()

    if (authUser) {
      void recordAdminAuditEvent({
        actorUserId: authUser.userId,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        method: 'DELETE',
        path: '/api/admin/service-plans',
        action: 'service-plan.delete',
        resourceType: COLLECTION,
        resourceId: id,
        status: 'success',
      })
    }

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    return setCorsHeaders(NextResponse.json({ success: false, message: String(error) }, { status: 500 }))
  }
}
