import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'
import { getAdminDb } from '@/lib/firebase/admin'

const NEW_PLANS = [
  {
    id: 'plan-4d-brow',
    type: '4D',
    name: '毛並眉（4Dマシーン）',
    description: '1本1本丁寧に毛並みを再現する最高峰の眉アートメイク',
    price: 50000,
    campaignPrice: 30000,
    campaignReferralDiscount: 3000,
    secondPrice: 25000,
    retouchPrice3m: 11000,
    retouchPrice6m: 15000,
    monitorEnabled: false,
    monitorPrice: null,
    otherShopPrice: null,
    duration: 165,
    durationText: '約2.5〜3時間',
    badge: '人気No.1',
    isFeatured: true,
    isPublished: true,
    displayOrder: 1,
  },
  {
    id: 'plan-powder-brow',
    type: '2D',
    name: 'パウダー眉（マシーン）',
    description: 'ふんわりパウダー仕上げでメイクしたような自然な眉',
    price: 45000,
    campaignPrice: 25000,
    campaignReferralDiscount: 2000,
    secondPrice: 22000,
    retouchPrice3m: 11000,
    retouchPrice6m: 15000,
    monitorEnabled: false,
    monitorPrice: null,
    otherShopPrice: null,
    duration: 120,
    durationText: '約2時間',
    badge: null,
    isFeatured: false,
    isPublished: true,
    displayOrder: 2,
  },
  {
    id: 'plan-smp',
    type: 'smp',
    name: 'SMP（頭皮ドット）',
    description: '薄毛・傷跡をカバーするスカルプマイクロピグメンテーション',
    price: 15000,
    campaignPrice: null,
    campaignReferralDiscount: null,
    secondPrice: null,
    retouchPrice3m: null,
    retouchPrice6m: null,
    monitorEnabled: false,
    monitorPrice: null,
    otherShopPrice: null,
    duration: 75,
    durationText: '約1〜1.5時間',
    badge: null,
    isFeatured: false,
    note: '※ 複数回推奨',
    isPublished: true,
    displayOrder: 3,
  },
]

export async function POST(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) return setCorsHeaders(adminError)

  const db = getAdminDb()
  if (!db) {
    return setCorsHeaders(
      NextResponse.json({ success: false, message: 'Firebase admin not configured' }, { status: 503 }),
    )
  }

  try {
    const batch = db.batch()
    const now = new Date()

    // 旧プランを非公開にする
    const existing = await db.collection('service-plans').get()
    for (const doc of existing.docs) {
      const oldId = doc.id
      const isNewPlan = NEW_PLANS.some((p) => p.id === oldId)
      if (!isNewPlan) {
        batch.update(doc.ref, { isPublished: false, updatedAt: now })
      }
    }

    // 新プランを作成/更新
    for (const plan of NEW_PLANS) {
      const ref = db.collection('service-plans').doc(plan.id)
      batch.set(ref, { ...plan, createdAt: now, updatedAt: now }, { merge: true })
    }

    await batch.commit()

    return setCorsHeaders(
      NextResponse.json({ success: true, message: `${NEW_PLANS.length} plans seeded, old plans unpublished` }),
    )
  } catch (error) {
    return setCorsHeaders(
      NextResponse.json({ success: false, message: String(error) }, { status: 500 }),
    )
  }
}
