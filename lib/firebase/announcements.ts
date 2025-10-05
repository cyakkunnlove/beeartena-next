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
import type { Announcement } from '@/lib/types'

const COLLECTION_NAME = 'announcements'

// デフォルトのお知らせ（空配列 - 運用開始時に追加）
export const defaultAnnouncements: Omit<Announcement, 'createdAt' | 'updatedAt'>[] = []

// お知らせ取得（公開中のみ）
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString()
  const q = query(
    collection(db, COLLECTION_NAME),
    where('publishAt', '<=', now),
    orderBy('publishAt', 'desc'),
    orderBy('priority', 'desc')
  )
  const snapshot = await getDocs(q)

  const announcements = snapshot.docs
    .map((doc) => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    })) as Announcement[]

  // 期限切れを除外
  return announcements.filter((ann) => {
    if (!ann.expiresAt) return true
    return new Date(ann.expiresAt) > new Date()
  })
}

// お知らせ取得（管理画面用：全件）
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('publishAt', 'desc'),
    orderBy('priority', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
  })) as Announcement[]
}

// お知らせ取得（ID指定）
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
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
  } as Announcement
}

// お知らせ作成
export async function createAnnouncement(
  announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Announcement> {
  const now = Timestamp.now()
  const docRef = doc(collection(db, COLLECTION_NAME))
  const newAnnouncement = {
    ...announcement,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(docRef, newAnnouncement)
  return {
    ...newAnnouncement,
    id: docRef.id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as Announcement
}

// お知らせ更新
export async function updateAnnouncement(
  id: string,
  updates: Partial<Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}

// お知らせ削除
export async function deleteAnnouncement(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
