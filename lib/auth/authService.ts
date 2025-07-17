import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/lib/types';
import { storageService } from '@/lib/storage/storageService';

const SESSION_KEY = 'beeartena_session';
const USERS_KEY = 'beeartena_users';

class AuthService {
  async login(email: string, password: string): Promise<User> {
    const users = storageService.getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    const passwordMatch = await bcrypt.compare(password, (user as any).passwordHash);
    if (!passwordMatch) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // Create session
    const session = {
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Remove password hash before returning
    const { passwordHash, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async register(email: string, password: string, name: string, phone: string): Promise<User> {
    const users = storageService.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser: User & { passwordHash: string } = {
      id: uuidv4(),
      email,
      passwordHash,
      name,
      phone,
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save user
    users.push(newUser);
    storageService.saveUsers(users);

    // Create customer record
    storageService.createCustomer({
      ...newUser,
      birthDate: undefined,
      gender: undefined,
      address: undefined,
      notes: '',
      tags: [],
    });

    // Initialize points
    storageService.initializePoints(newUser.id);

    // Create session
    const session = {
      userId: newUser.id,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr);
      const users = storageService.getUsers();
      const user = users.find(u => u.id === session.userId);
      
      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Remove password hash
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const users = storageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('ユーザーが見つかりません');
    }

    // Update user
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      id: userId, // Ensure ID doesn't change
      role: users[userIndex].role, // Ensure role doesn't change
      updatedAt: new Date(),
    };

    storageService.saveUsers(users);

    // Update customer record if needed
    if (updates.name || updates.phone) {
      const customer = storageService.getCustomer(userId);
      if (customer) {
        storageService.updateCustomer(userId, updates);
      }
    }

    const { passwordHash, ...userWithoutPassword } = users[userIndex] as any;
    return userWithoutPassword;
  }

  isAuthenticated(): boolean {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return !!sessionStr;
  }

  async checkAdminRole(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'admin';
  }
}

export const authService = new AuthService();