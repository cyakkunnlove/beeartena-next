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
    id: 'plan-2d',
    type: '2D',
    name: '2Dまつ毛エクステ',
    description: '自然な仕上がりで初めての方にもおすすめの2Dエクステンション',
    price: 8000,
    monitorPrice: 6000,
    otherShopPrice: 9000,
    duration: 90,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 1,
  },
  {
    id: 'plan-3d',
    type: '3D',
    name: '3Dまつ毛エクステ',
    description: 'しっかりとしたボリュームで華やかな印象を演出する3Dエクステンション',
    price: 10000,
    monitorPrice: 8000,
    otherShopPrice: 11000,
    duration: 120,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 2,
  },
  {
    id: 'plan-4d',
    type: '4D',
    name: '4Dまつ毛エクステ',
    description: 'パウダーとフェザーの良さを組み合わせたサロン人気No.1プラン',
    price: 12000,
    monitorPrice: 10000,
    otherShopPrice: 14000,
    duration: 150,
    badge: '人気No.1',
    isFeatured: true,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 3,
  },
  {
    id: 'plan-wax',
    type: 'wax',
    name: '眉毛ワックス脱毛',
    description: 'プロの技術で眉周りを整えるワックス脱毛メニュー',
    price: 3000,
    duration: 30,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 4,
  },
  {
    id: 'plan-retouch-3m',
    type: 'retouch',
    name: '3ヶ月以内リタッチ',
    description: '施術から3ヶ月以内のお客様向けのフォローアップ施術',
    price: 11000,
    duration: 90,
    badge: 'リピーター限定',
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 5,
  },
  {
    id: 'plan-retouch-6m',
    type: 'retouch',
    name: '半年以内リタッチ',
    description: '半年以内に色味を整えたい方向けのメンテナンスプラン',
    price: 15000,
    duration: 90,
    isPublished: true,
    effectiveFrom: new Date().toISOString(),
    displayOrder: 6,
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
  await setDoc(docRef, newPlan)
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
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}

// サービスプラン削除
export async function deleteServicePlan(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
