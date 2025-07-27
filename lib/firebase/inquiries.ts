import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Inquiry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mockInquiryService } from '../mock/mockFirebase';

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return apiKey && apiKey !== 'test-api-key' && apiKey !== '';
};

export const inquiryService = {
  // 問い合わせ作成
  async createInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>): Promise<Inquiry> {
    if (!isFirebaseConfigured()) {
      return mockInquiryService.createInquiry(inquiry);
    }

    try {
      const newInquiry: Inquiry = {
        ...inquiry,
        id: uuidv4(),
        status: 'unread',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'inquiries', newInquiry.id), {
        ...newInquiry,
        createdAt: Timestamp.fromDate(newInquiry.createdAt)
      });

      return newInquiry;
    } catch (error: any) {
      throw new Error(error.message || '問い合わせの送信に失敗しました');
    }
  },

  // 問い合わせ取得
  async getInquiry(id: string): Promise<Inquiry | null> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return null;
    }

    try {
      const docRef = await getDoc(doc(db, 'inquiries', id));
      if (!docRef.exists()) return null;

      const data = docRef.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate()
      } as Inquiry;
    } catch (error: any) {
      throw new Error(error.message || '問い合わせの取得に失敗しました');
    }
  },

  // 全問い合わせ取得（管理者用）
  async getAllInquiries(): Promise<Inquiry[]> {
    if (!isFirebaseConfigured()) {
      return mockInquiryService.getAllInquiries();
    }

    try {
      const q = query(
        collection(db, 'inquiries'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate()
        } as Inquiry;
      });
    } catch (error: any) {
      throw new Error(error.message || '問い合わせ一覧の取得に失敗しました');
    }
  },

  // 問い合わせステータス更新
  async updateInquiryStatus(id: string, status: 'unread' | 'read' | 'replied'): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockInquiryService.updateInquiryStatus(id, status as any);
    }

    try {
      await updateDoc(doc(db, 'inquiries', id), {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error: any) {
      throw new Error(error.message || '問い合わせステータスの更新に失敗しました');
    }
  },

  // 問い合わせに回答
  async replyToInquiry(id: string, reply: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return;
    }

    try {
      await updateDoc(doc(db, 'inquiries', id), {
        reply,
        status: 'answered',
        repliedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error: any) {
      throw new Error(error.message || '問い合わせへの回答に失敗しました');
    }
  }
};