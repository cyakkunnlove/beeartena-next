// Error handling types
export type ErrorWithMessage = {
  message: string
  code?: string
  statusCode?: number
}

export type ApiError = Error | ErrorWithMessage | unknown

// Helper function to get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}

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

// Chart and Analytics types
export interface ChartData {
  month: string
  revenue: number
  count: number
}

export interface ServiceChartData {
  name: string
  value: number
}

export interface TierChartData {
  name: string
  value: number
  fill: string
}

export interface TimeSlotChartData {
  name: string
  value: number
}

// Calendar Event types for ReservationCalendar
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Reservation
}

export interface CalendarEventProps {
  event: CalendarEvent
}

export interface CalendarToolbarProps {
  date: Date
  label: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: 'month' | 'week' | 'day' | 'agenda') => void
  view: 'month' | 'week' | 'day' | 'agenda'
}

// Form types
export interface ReservationFormData {
  name: string
  email: string
  phone: string
  serviceType: '2D' | '3D' | '4D'
  date: string
  time: string
  notes?: string
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  inquiryType: 'general' | 'menu' | 'booking' | 'aftercare' | 'other' | ''
  message: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Local Storage types
export interface StoredUser extends User {
  password?: string // Only for mock/local storage
}

// Firebase Firestore types
export interface FirestoreTimestamp {
  seconds: number
  nanoseconds: number
  toDate(): Date
}

// Type guards
export function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    'nanoseconds' in value &&
    'toDate' in value &&
    typeof (value as FirestoreTimestamp).toDate === 'function'
  )
}
