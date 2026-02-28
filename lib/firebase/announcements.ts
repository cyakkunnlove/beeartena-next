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
  const now = new Date()

  // publishAt は Timestamp または文字列で保存されている可能性があるため、
  // 全件取得してクライアント側でフィルタリングする（件数が少ないため問題なし）
  const q = query(
    collection(db, COLLECTION_NAME),
  )
  const snapshot = await getDocs(q)

  const resolveDate = (value: unknown): Date | null => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value === 'string') {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      try {
        const parsed = (value as { toDate: () => Date }).toDate()
        return Number.isNaN(parsed.getTime()) ? null : parsed
      } catch {
        return null
      }
    }
    return null
  }

  const announcements = snapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        publishAt: resolveDate(data.publishAt)?.toISOString() ?? new Date().toISOString(),
        expiresAt: resolveDate(data.expiresAt)?.toISOString() ?? undefined,
        createdAt: resolveDate(data.createdAt)?.toISOString() ?? new Date().toISOString(),
        updatedAt: resolveDate(data.updatedAt)?.toISOString() ?? new Date().toISOString(),
      }
    }) as Announcement[]

  // 公開中のみ（publishAt <= now かつ 期限内）
  return announcements.filter((ann) => {
    const publishDate = new Date(ann.publishAt)
    if (publishDate > now) return false
    if (!ann.expiresAt) return true
    return new Date(ann.expiresAt) > now
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
