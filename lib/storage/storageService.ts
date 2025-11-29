import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { User, Customer, Points, PointTransaction, Reservation, Inquiry } from '@/lib/types'

const STORAGE_KEYS = {
  USERS: 'beeartena_users',
  CUSTOMERS: 'beeartena_customers',
  POINTS: 'beeartena_points',
  POINT_TRANSACTIONS: 'beeartena_point_transactions',
  RESERVATIONS: 'beeartena_reservations',
  INQUIRIES: 'beeartena_inquiries',
}

class StorageService {
  // Initialize with demo data if empty
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeDemoData()
    }
  }

  private initializeDemoData() {
    // Initialize admin user if no users exist
    const users = this.getUsers()
    if (users.length === 0) {
      const adminPasswordHash = bcrypt.hashSync('admin123', 10)
      const adminUser = {
        id: 'admin-001',
        email: 'admin@beeartena.jp',
        passwordHash: adminPasswordHash,
        name: '管理者',
        phone: '090-0000-0000',
        role: 'admin' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
      this.saveUsers([adminUser])

      // Create demo customers
      const demoCustomers = [
        {
          id: 'cust-001',
          email: 'yamada@example.com',
          passwordHash: bcrypt.hashSync('password123', 10),
          name: '山田 花子',
          phone: '090-1111-1111',
          role: 'customer' as const,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'cust-002',
          email: 'sato@example.com',
          passwordHash: bcrypt.hashSync('password123', 10),
          name: '佐藤 美咲',
          phone: '090-2222-2222',
          role: 'customer' as const,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        },
      ]

      this.saveUsers([adminUser, ...demoCustomers])

      // Initialize customer records
      demoCustomers.forEach((customer) => {
        this.createCustomer({
          ...customer,
          birthDate: '1990-01-01',
          gender: 'female',
          address: {
            prefecture: '岐阜県',
            city: '恵那市',
          },
          notes: '',
          tags: ['VIP'],
        })
        this.initializePoints(customer.id)
      })

      // Create demo reservations
      this.createDemoReservations()
    }
  }

  private createDemoReservations() {
    const today = new Date()
    const reservations: Reservation[] = [
      {
        id: 'res-001',
        customerId: 'cust-001',
        customerName: '山田 花子',
        customerEmail: 'yamada@example.com',
        customerPhone: '090-1111-1111',
        serviceType: '4D',
        serviceName: 'パウダー&フェザー',
        price: 25000,
        date: today.toISOString().split('T')[0],
        time: '10:00',
        status: 'confirmed',
        notes: 'リピーター様',
        createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'res-002',
        customerId: 'cust-002',
        customerName: '佐藤 美咲',
        customerEmail: 'sato@example.com',
        customerPhone: '090-2222-2222',
        serviceType: '2D',
        serviceName: 'パウダーブロウ',
        price: 20000,
        date: today.toISOString().split('T')[0],
        time: '14:00',
        status: 'pending',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations))
  }

  // User methods
  getUsers(): (User & { passwordHash?: string })[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS)
    return data ? JSON.parse(data) : []
  }

  saveUsers(users: (User & { passwordHash?: string })[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
  }

  // Customer methods
  getCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
    return data ? JSON.parse(data) : []
  }

  replaceCustomers(customers: Customer[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers))
  }

  getCustomer(userId: string): Customer | null {
    const customers = this.getCustomers()
    return customers.find((c) => c.id === userId) || null
  }

  createCustomer(customer: Customer) {
    const customers = this.getCustomers()
    customers.push(customer)
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers))
  }

  updateCustomer(userId: string, updates: Partial<Customer>) {
    const customers = this.getCustomers()
    const index = customers.findIndex((c) => c.id === userId)
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates, updatedAt: new Date() }
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers))
    }
  }

  // Points methods
  getAllPoints(): Points[] {
    const data = localStorage.getItem(STORAGE_KEYS.POINTS)
    return data ? JSON.parse(data) : []
  }

  getPoints(userId: string): Points | null {
    const allPoints = this.getAllPoints()
    return allPoints.find((p) => p.userId === userId) || null
  }

  initializePoints(userId: string) {
    const allPoints = this.getAllPoints()
    if (!allPoints.find((p) => p.userId === userId)) {
      allPoints.push({
        userId,
        currentPoints: 0,
        lifetimePoints: 0,
        tier: 'bronze',
        tierExpiry: undefined,
      })
      localStorage.setItem(STORAGE_KEYS.POINTS, JSON.stringify(allPoints))
    }
  }

  updatePoints(userId: string, updates: Partial<Points>) {
    const allPoints = this.getAllPoints()
    const index = allPoints.findIndex((p) => p.userId === userId)
    if (index !== -1) {
      allPoints[index] = { ...allPoints[index], ...updates }
      localStorage.setItem(STORAGE_KEYS.POINTS, JSON.stringify(allPoints))
    }
  }

  // Point transaction methods
  getPointTransactions(userId?: string): PointTransaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.POINT_TRANSACTIONS)
    const transactions = data ? JSON.parse(data) : []
    if (userId) {
      return transactions.filter((t: PointTransaction) => t.userId === userId)
    }
    return transactions
  }

  addPointTransaction(transaction: Omit<PointTransaction, 'id' | 'createdAt'>) {
    const transactions = this.getPointTransactions()
    const newTransaction: PointTransaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date(),
    }
    transactions.push(newTransaction)
    localStorage.setItem(STORAGE_KEYS.POINT_TRANSACTIONS, JSON.stringify(transactions))

    // Update user points
    const points = this.getPoints(transaction.userId)
    if (points) {
      const pointsUpdate: Partial<Points> = {
        currentPoints: transaction.balance,
        lifetimePoints:
          transaction.type === 'earned'
            ? points.lifetimePoints + transaction.amount
            : points.lifetimePoints,
      }

      // Update tier based on lifetime points
      if (pointsUpdate.lifetimePoints! >= 100000) {
        pointsUpdate.tier = 'platinum'
      } else if (pointsUpdate.lifetimePoints! >= 50000) {
        pointsUpdate.tier = 'gold'
      } else if (pointsUpdate.lifetimePoints! >= 20000) {
        pointsUpdate.tier = 'silver'
      } else {
        pointsUpdate.tier = 'bronze'
      }

      this.updatePoints(transaction.userId, pointsUpdate)
    }

    return newTransaction
  }

  // Reservation methods
  getReservations(customerId?: string): Reservation[] {
    const data = localStorage.getItem(STORAGE_KEYS.RESERVATIONS)
    const reservations = data ? JSON.parse(data) : []
    if (customerId) {
      return reservations.filter((r: Reservation) => r.customerId === customerId)
    }
    return reservations
  }

  createReservation(reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Reservation {
    const reservations = this.getReservations()
    const newReservation: Reservation = {
      ...reservation,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    reservations.push(newReservation)
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations))
    return newReservation
  }

  updateReservation(id: string, updates: Partial<Reservation>) {
    const reservations = this.getReservations()
    const index = reservations.findIndex((r) => r.id === id)
    if (index !== -1) {
      reservations[index] = { ...reservations[index], ...updates, updatedAt: new Date() }
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations))

      // If completed, add points
      if (updates.status === 'completed' && reservations[index].status !== 'completed') {
        const reservation = reservations[index]
        if (reservation.customerId) {
          const pointsEarned = Math.floor(reservation.price * 0.05) // 5% points
          const currentPoints = this.getPoints(reservation.customerId)

          this.addPointTransaction({
            userId: reservation.customerId,
            type: 'earned',
            amount: pointsEarned,
            balance: (currentPoints?.currentPoints || 0) + pointsEarned,
            description: `${reservation.serviceName}の施術`,
            referenceId: reservation.id,
          })
        }
      }
    }
  }

  // Inquiry methods
  getInquiries(): Inquiry[] {
    const data = localStorage.getItem(STORAGE_KEYS.INQUIRIES)
    return data ? JSON.parse(data) : []
  }

  createInquiry(inquiry: Omit<Inquiry, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Inquiry {
    const inquiries = this.getInquiries()
    const newInquiry: Inquiry = {
      ...inquiry,
      id: uuidv4(),
      status: 'unread',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    inquiries.push(newInquiry)
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries))
    return newInquiry
  }

  updateInquiry(id: string, updates: Partial<Inquiry>) {
    const inquiries = this.getInquiries()
    const index = inquiries.findIndex((i) => i.id === id)
    if (index !== -1) {
      inquiries[index] = { ...inquiries[index], ...updates, updatedAt: new Date() }
      localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries))
    }
  }

  // Additional inquiry methods
  getAllInquiries(): Inquiry[] {
    return this.getInquiries()
  }

  updateInquiryStatus(inquiryId: string, status: 'read' | 'unread'): void {
    const inquiries = this.getInquiries()
    const index = inquiries.findIndex((i) => i.id === inquiryId)
    if (index !== -1) {
      inquiries[index].status = status
      inquiries[index].updatedAt = new Date()
      localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries))
    }
  }

  saveInquiries(inquiries: Inquiry[]): void {
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries))
  }

  // Admin methods
  getAllCustomers(): Customer[] {
    const users = this.getUsers()
    return users
      .filter((user) => user.role === 'customer')
      .map((user) => {
        const customer = this.getCustomer(user.id)
        if (customer) {
          // Add points and tier information
          const points = this.getPoints(user.id)
          const reservations = this.getReservations(user.id)
          const totalSpent = reservations
            .filter((r) => r.status === 'completed')
            .reduce((sum, r) => sum + r.price, 0)

          return {
            ...customer,
            tier: points?.tier || 'bronze',
            points: points?.currentPoints || 0,
            totalSpent,
          }
        }
        return null
      })
      .filter(Boolean) as Customer[]
  }

  getAllReservations(): Reservation[] {
    return this.getReservations()
  }

  updateReservationStatus(reservationId: string, status: Reservation['status']): void {
    const reservations = this.getReservations()
    const index = reservations.findIndex((r) => r.id === reservationId)
    if (index !== -1) {
      const oldStatus = reservations[index].status
      reservations[index].status = status
      reservations[index].updatedAt = new Date()
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations))

      // If completed, add points
      if (status === 'completed' && oldStatus !== 'completed') {
        const reservation = reservations[index]
        if (reservation.customerId && reservation.customerId !== 'guest') {
          const pointsEarned = Math.floor(reservation.price * 0.05) // 5% points
          this.addPoints(
            reservation.customerId,
            pointsEarned,
            'earned',
            `${reservation.serviceName}の施術完了`,
          )
        }
      }
    }
  }

  saveReservations(reservations: Reservation[]): void {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations))
  }

  // Point management helper
  addPoints(
    userId: string,
    amount: number,
    type: 'earned' | 'used' | 'manual',
    description: string,
  ): void {
    const currentPoints = this.getPoints(userId)
    const newBalance =
      type === 'used'
        ? (currentPoints?.currentPoints || 0) - amount
        : (currentPoints?.currentPoints || 0) + amount

    this.addPointTransaction({
      userId,
      type,
      amount,
      balance: newBalance,
      description,
    })
  }

  // Statistics methods
  getDashboardStats() {
    const customers = this.getCustomers()
    const reservations = this.getReservations()
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()

    const todayReservations = reservations.filter((r) => r.date === today)
    const monthlyReservations = reservations.filter((r) => {
      const date = new Date(r.date)
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear
    })

    const monthlyRevenue = monthlyReservations
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.price, 0)

    return {
      totalCustomers: customers.length,
      todayReservations: todayReservations.length,
      monthlyRevenue,
      totalReservations: reservations.length,
      customerGrowth: 15.3, // Mock data
      revenueGrowth: 22.5, // Mock data
    }
  }

  // Export data
  exportData() {
    const data = {
      users: this.getUsers(),
      customers: this.getCustomers(),
      points: this.getAllPoints(),
      pointTransactions: this.getPointTransactions(),
      reservations: this.getReservations(),
      inquiries: this.getInquiries(),
      exportedAt: new Date().toISOString(),
    }
    return data
  }

  // Clear all data (for development)
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
    localStorage.removeItem('beeartena_session')
  }
}

export const storageService = new StorageService()
