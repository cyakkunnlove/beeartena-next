import bcrypt from 'bcryptjs';
import { User } from '@/lib/types';
import { firebaseAuth } from '@/lib/firebase/auth';
import { userService } from '@/lib/firebase/users';

const SESSION_KEY = 'beeartena_session';

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    // Firebase認証状態の監視
    if (typeof window !== 'undefined') {
      firebaseAuth.onAuthStateChange((user) => {
        this.currentUser = user;
        if (user) {
          // セッション情報を保存
          const session = {
            userId: user.id,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      });
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const user = await firebaseAuth.login(email, password);
      this.currentUser = user;
      return user;
    } catch (error: any) {
      if (error.message.includes('auth/user-not-found') || 
          error.message.includes('auth/wrong-password')) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }
      throw error;
    }
  }

  async register(email: string, password: string, name: string, phone: string): Promise<User> {
    try {
      const user = await firebaseAuth.register(email, password, name, phone);
      this.currentUser = user;
      return user;
    } catch (error: any) {
      if (error.message.includes('auth/email-already-in-use')) {
        throw new Error('このメールアドレスは既に登録されています');
      }
      if (error.message.includes('auth/weak-password')) {
        throw new Error('パスワードは6文字以上で設定してください');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    await firebaseAuth.logout();
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    // キャッシュされたユーザーがあればそれを返す
    if (this.currentUser) {
      return this.currentUser;
    }

    // Firebaseから現在のユーザーを取得
    const user = await firebaseAuth.getCurrentUser();
    this.currentUser = user;
    return user;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    // roleは直接更新できないようにする
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    
    await userService.updateUser(userId, safeUpdates);
    
    // 更新後のユーザー情報を取得
    const updatedUser = await userService.getUser(userId);
    if (!updatedUser) {
      throw new Error('ユーザーが見つかりません');
    }
    
    this.currentUser = updatedUser;
    return updatedUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  async checkAdminRole(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'admin';
  }
}

export const authService = new AuthService();