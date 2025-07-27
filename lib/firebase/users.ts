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
import { User } from '../types';
import { mockUserService } from '../mock/mockFirebase';

// Firebaseが設定されているかチェック
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return apiKey && apiKey !== 'test-api-key' && apiKey !== '';
};

export const userService = {
  // ユーザー作成
  async createUser(user: User): Promise<void> {
    if (!isFirebaseConfigured()) {
      // モックでは処理不要
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        createdAt: Timestamp.fromDate(user.createdAt || new Date())
      });
    } catch (error: any) {
      throw new Error(error.message || 'ユーザーの作成に失敗しました');
    }
  },

  // ユーザー取得
  async getUser(id: string): Promise<User | null> {
    if (!isFirebaseConfigured()) {
      return mockUserService.getUser(id);
    }

    try {
      const docRef = await getDoc(doc(db, 'users', id));
      if (!docRef.exists()) return null;

      const data = docRef.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as User;
    } catch (error: any) {
      throw new Error(error.message || 'ユーザーの取得に失敗しました');
    }
  },

  // メールアドレスでユーザー検索
  async getUserByEmail(email: string): Promise<User | null> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return null;
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const data = querySnapshot.docs[0].data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as User;
    } catch (error: any) {
      throw new Error(error.message || 'ユーザーの検索に失敗しました');
    }
  },

  // 全ユーザー取得（管理者用）
  async getAllUsers(): Promise<User[]> {
    if (!isFirebaseConfigured()) {
      return mockUserService.getAllUsers();
    }

    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as User;
      });
    } catch (error: any) {
      throw new Error(error.message || 'ユーザー一覧の取得に失敗しました');
    }
  },

  // ユーザー情報更新
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (!isFirebaseConfigured()) {
      return mockUserService.updateUser(id, updates);
    }

    try {
      const updateData: any = { ...updates };
      if (updateData.createdAt) {
        updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
      }
      updateData.updatedAt = Timestamp.now();

      await updateDoc(doc(db, 'users', id), updateData);
    } catch (error: any) {
      throw new Error(error.message || 'ユーザー情報の更新に失敗しました');
    }
  },

  // ユーザーのランク計算
  calculateUserRank(totalSpent: number): string {
    if (totalSpent >= 500000) return 'Platinum';
    if (totalSpent >= 300000) return 'Gold';
    if (totalSpent >= 100000) return 'Silver';
    return 'Bronze';
  },

  // ユーザーの累計利用金額更新
  async updateTotalSpent(userId: string, amount: number): Promise<void> {
    if (!isFirebaseConfigured()) {
      // モックでは実装省略
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません');
      }

      const currentTotal = userDoc.data().totalSpent || 0;
      const newTotal = currentTotal + amount;
      const newRank = this.calculateUserRank(newTotal);

      await updateDoc(doc(db, 'users', userId), {
        totalSpent: newTotal,
        rank: newRank,
        updatedAt: Timestamp.now()
      });
    } catch (error: any) {
      throw new Error(error.message || '累計利用金額の更新に失敗しました');
    }
  }
};