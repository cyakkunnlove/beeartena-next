// Mock Firebase implementation for development without Firebase setup
import { User, Reservation, PointTransaction as Point, Inquiry } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

// Mock data storage
const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@beeartena.jp',
    name: '管理者',
    phone: '090-0000-0000',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'テストユーザー',
    phone: '090-1234-5678',
    role: 'customer',
    birthday: `1990-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`, // 今日が誕生日
    points: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
]

const mockReservations: Reservation[] = []
const mockPoints: Point[] = []
const mockInquiries: Inquiry[] = []

// Helper to simulate async behavior
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockAuth = {
  currentUser: null as User | null,

  async login(email: string, password: string): Promise<User> {
    await delay(500)

    // 管理者アカウント
    if (email === 'admin@beeartena.jp' && password === 'admin123') {
      const admin = mockUsers.find((u) => u.email === email)!
      this.currentUser = admin
      return admin
    }

    // 一般ユーザー
    const user = mockUsers.find((u) => u.email === email)
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません')
    }

    // 簡易パスワードチェック（実際はFirebase Authが処理）
    if (password.length < 6) {
      throw new Error('メールアドレスまたはパスワードが正しくありません')
    }

    this.currentUser = user
    return user
  },

  async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    birthday?: string,
  ): Promise<User> {
    await delay(500)

    if (mockUsers.find((u) => u.email === email)) {
      throw new Error('このメールアドレスは既に登録されています')
    }

    const newUser: User = {
      id: uuidv4(),
      email,
      name,
      phone,
      role: 'customer',
      birthday: birthday,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockUsers.push(newUser)
    this.currentUser = newUser
    return newUser
  },

  async logout(): Promise<void> {
    await delay(100)
    this.currentUser = null
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100)
    return this.currentUser
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    // Simulate auth state change
    setTimeout(() => callback(this.currentUser), 100)

    // Return unsubscribe function
    return () => {}
  },
}

export const mockReservationService = {
  async createReservation(
    reservation: Omit<Reservation, 'id' | 'createdAt'>,
  ): Promise<Reservation> {
    await delay(500)

    const newReservation: Reservation = {
      ...reservation,
      id: uuidv4(),
      createdAt: new Date(),
      status: 'pending',
    }

    mockReservations.push(newReservation)
    return newReservation
  },

  async getReservation(id: string): Promise<Reservation | null> {
    await delay(200)
    return mockReservations.find((r) => r.id === id) || null
  },

  async getUserReservations(userId: string): Promise<Reservation[]> {
    await delay(300)
    return mockReservations.filter((r) => r.customerId === userId)
  },

  async getAllReservations(): Promise<Reservation[]> {
    await delay(300)
    return mockReservations
  },

  async updateReservationStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  ): Promise<void> {
    await delay(300)
    const reservation = mockReservations.find((r) => r.id === id)
    if (reservation) {
      reservation.status = status
    }
  },

  async cancelReservation(id: string, reason?: string): Promise<void> {
    await delay(300)
    const reservation = mockReservations.find((r) => r.id === id)
    if (reservation) {
      reservation.status = 'cancelled'
      ;(reservation as any).cancelReason = reason
    }
  },

  async getReservationsByDate(date: Date): Promise<Reservation[]> {
    await delay(200)
    const dateStr = date.toISOString().split('T')[0]
    return mockReservations.filter((r) => r.date === dateStr && r.status !== 'cancelled')
  },
}

export const mockPointService = {
  async addPoints(userId: string, amount: number, description: string): Promise<Point> {
    await delay(300)

    // 現在のポイント残高を計算
    const currentBalance = mockPoints
      .filter((p) => p.userId === userId)
      .reduce((sum, p) => sum + (p.type === 'earned' ? p.amount : -p.amount), 0)

    const newBalance = currentBalance + amount

    const point: Point = {
      id: uuidv4(),
      userId,
      amount,
      type: 'earned',
      balance: newBalance,
      description,
      createdAt: new Date(),
    }

    mockPoints.push(point)

    return point
  },

  async usePoints(userId: string, amount: number, description: string): Promise<Point> {
    await delay(300)

    const userPoints = mockPoints
      .filter((p) => p.userId === userId)
      .reduce((sum, p) => sum + (p.type === 'earned' ? p.amount : -p.amount), 0)

    if (userPoints < amount) {
      throw new Error('ポイントが不足しています')
    }

    const newBalance = userPoints - amount

    const point: Point = {
      id: uuidv4(),
      userId,
      amount,
      type: 'used',
      balance: newBalance,
      description,
      createdAt: new Date(),
    }

    mockPoints.push(point)

    return point
  },

  async getUserPointHistory(userId: string): Promise<Point[]> {
    await delay(200)
    return mockPoints.filter((p) => p.userId === userId)
  },

  async getUserPoints(userId: string): Promise<number> {
    await delay(100)
    const points = mockPoints
      .filter((p) => p.userId === userId)
      .reduce((sum, p) => sum + (p.type === 'earned' ? p.amount : -p.amount), 0)
    return points
  },

  async addReservationPoints(userId: string, reservationAmount: number): Promise<Point> {
    const pointAmount = Math.floor(reservationAmount * 0.05)
    return this.addPoints(userId, pointAmount, `予約完了ポイント（${reservationAmount}円の5%）`)
  },
}

export const mockUserService = {
  async getUser(id: string): Promise<User | null> {
    await delay(200)
    return mockUsers.find((u) => u.id === id) || null
  },

  async getAllUsers(): Promise<User[]> {
    await delay(300)
    return mockUsers
  },

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await delay(300)
    const userIndex = mockUsers.findIndex((u) => u.id === id)
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates }
    }
  },
}

export const mockInquiryService = {
  async createInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>): Promise<Inquiry> {
    await delay(500)

    const newInquiry: Inquiry = {
      ...inquiry,
      id: uuidv4(),
      status: 'unread',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockInquiries.push(newInquiry)
    return newInquiry
  },

  async getAllInquiries(): Promise<Inquiry[]> {
    await delay(300)
    return mockInquiries
  },

  async updateInquiryStatus(id: string, status: 'unread' | 'read' | 'replied'): Promise<void> {
    await delay(300)
    const inquiry = mockInquiries.find((i) => i.id === id)
    if (inquiry) {
      inquiry.status = status
    }
  },
}
