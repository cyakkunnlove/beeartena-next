import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'

import { db } from './config'

import type { ServicePlan } from '@/lib/types'

const COLLECTION_NAME = 'service-plans'

// デフォルトのサービスプラン
export const defaultServicePlans: Omit<ServicePlan, 'createdAt' | 'updatedAt'>[] = [
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
    duration: 165,
    durationText: '約2.5〜3時間',
    badge: '人気No.1',
    isFeatured: true,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
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
    duration: 120,
    durationText: '約2時間',
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 2,
  },
  {
    id: 'plan-smp',
    type: 'smp',
    name: 'SMP（頭皮ドット）',
    description: '薄毛・傷跡をカバーするスカルプマイクロピグメンテーション',
    price: 15000,
    monitorEnabled: false,
    duration: 75,
    durationText: '約1〜1.5時間',
    note: '※ 複数回推奨',
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 3,
  },
]

// サービスプラン取得（全件）
export async function getServicePlans(): Promise<ServicePlan[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('isPublished', '==', true),
    orderBy('displayOrder', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
  })) as ServicePlan[]
}

// サービスプラン取得（管理画面用：非公開含む）
export async function getAllServicePlans(): Promise<ServicePlan[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy('displayOrder', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
  })) as ServicePlan[]
}

// サービスプラン取得（ID指定）
export async function getServicePlanById(id: string): Promise<ServicePlan | null> {
  const docRef = doc(db, COLLECTION_NAME, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    return null
  }
  return {
    ...docSnap.data(),
    id: docSnap.id,
    createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt,
    updatedAt: docSnap.data().updatedAt?.toDate?.() || docSnap.data().updatedAt,
  } as ServicePlan
}

// サービスプラン作成
export async function createServicePlan(
  plan: Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServicePlan> {
  const now = Timestamp.now()
  const docRef = doc(collection(db, COLLECTION_NAME))
  const newPlan = {
    ...plan,
    createdAt: now,
    updatedAt: now,
  }
  try {
    await setDoc(docRef, newPlan)
  } catch (error: any) {
    console.error('Failed to create service plan:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    throw error
  }
  return {
    ...newPlan,
    id: docRef.id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as ServicePlan
}

// サービスプラン更新
export async function updateServicePlan(
  id: string,
  updates: Partial<Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    })
  } catch (error: any) {
    console.error('Failed to update service plan:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    throw error
  }
}

// サービスプラン削除
export async function deleteServicePlan(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
