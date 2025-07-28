// User types
export interface User {
  id: string
  email: string
  name: string
  phone: string
  role: 'customer' | 'admin'
  points?: number
  birthday?: string // YYYY-MM-DD format
  lastBirthdayPointsYear?: number
  createdAt: Date
  updatedAt: Date
}

export interface Customer extends User {
  birthDate?: Date
  gender?: 'male' | 'female' | 'other'
  address?: {
    street?: string
    city?: string
    prefecture?: string
    postalCode?: string
  }
  notes?: string
  tags?: string[]
  // For admin views
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  points?: number
  totalSpent?: number
}

// Points types
export interface Points {
  userId: string
  currentPoints: number
  lifetimePoints: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  tierExpiry?: Date
}

export interface PointTransaction {
  id: string
  userId: string
  type: 'earned' | 'used' | 'manual' | 'expired' | 'adjusted' | 'redeemed'
  amount: number
  balance?: number
  description?: string
  reason?: string
  referenceId?: string
  createdAt: string | Date
}

// Reservation types
export interface Reservation {
  id: string
  customerId: string | null // null許可：未登録ユーザーの予約対応
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceType: '2D' | '3D' | '4D'
  serviceName: string
  price: number
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Inquiry types
export interface Inquiry {
  id: string
  name: string
  email: string
  phone?: string
  type: 'general' | 'menu' | 'booking' | 'aftercare' | 'other'
  message: string
  status: 'unread' | 'read' | 'replied'
  createdAt: Date
  updatedAt: Date
}

// Auth types
export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    birthday?: string,
  ) => Promise<User>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<User>
}

// Service types
export interface Service {
  id: string
  type: '2D' | '3D' | '4D'
  name: string
  description: string
  price: number
  monitorPrice: number
  duration: number // in minutes
  image: string
}

// Statistics types
export interface DashboardStats {
  totalCustomers: number
  todayReservations: number
  monthlyRevenue: number
  totalReservations: number
  customerGrowth: number
  revenueGrowth: number
}

// Time slot types
export interface TimeSlot {
  time: string
  available: boolean
  date?: string
  maxCapacity?: number
  currentBookings?: number
}

// Business hours and settings
export interface BusinessHours {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  open: string // "09:00"
  close: string // "17:00"
  isOpen: boolean
  slots?: TimeSlot[]
}

export interface ReservationSettings {
  slotDuration: number // in minutes
  maxCapacityPerSlot: number
  businessHours: BusinessHours[]
  blockedDates?: string[] // ISO date strings
}
