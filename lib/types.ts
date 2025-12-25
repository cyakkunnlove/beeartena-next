// Error handling types
export type ErrorWithMessage = {
  message: string
  code?: string
  statusCode?: number
}

export type ApiError = Error | ErrorWithMessage | unknown

// Helper function to get error message
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return ''
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error)
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown }
    return typeof message === 'string' ? message : String(message ?? '')
  }

  return ''
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
  birthDate?: string // alternative key in newer API
  gender?: string
  postalCode?: string
  prefecture?: string
  city?: string
  street?: string
  address?: string | Record<string, unknown>
  lastBirthdayPointsYear?: number
  createdAt: Date
  updatedAt: Date
  termsAcceptedAt?: Date | string
  privacyAcceptedAt?: Date | string
  // Search optimization fields
  nameLower?: string // lowercase name for case-insensitive search
  emailLower?: string // lowercase email for case-insensitive search
  phoneDigits?: string // digits-only phone for normalized search
}

export interface Customer extends User {
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
  lifetimePoints?: number
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
export interface ReservationIntakeForm {
  allergies: {
    selections: string[]
    details: string
  }
  skinConcerns: {
    selections: string[]
    details: string
  }
  pregnancyStatus: 'none' | 'pregnant' | 'breastfeeding' | 'possible'
  infectionHistory: {
    selections: string[]
    other: string
  }
  mentalState: 'stable' | 'slightly_tired' | 'stressed' | 'mood_changes'
  goals: {
    selections: string[]
    other: string
  }
  medications: {
    selections: string[]
    other: string
  }
}

export interface Reservation {
  id: string
  customerId: string | null // null許可：未登録ユーザーの予約対応
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceType: '2D' | '3D' | '4D' | 'wax' | string // 柔軟に対応
  serviceName: string
  price: number
  maintenanceOptions?: string[] // 選択されたメンテナンスオプション
  maintenancePrice?: number // メンテナンス料金
  totalPrice?: number // サービス料金 + メンテナンス料金
  date: string
  time: string
  durationMinutes?: number // 施術時間（分）
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string // 作成者のUID（管理者が代理作成した場合など）
  completedAt?: Date // 予約完了日時
  cancelReason?: string // キャンセル理由
  cancelledAt?: Date // キャンセル日時
  isMonitor?: boolean // モニター価格の予約
  finalPrice?: number // 実際の支払い金額（ポイント利用後）
  pointsUsed?: number // 利用したポイント数
  intakeForm?: ReservationIntakeForm
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
  updateProfile: (updates: Record<string, unknown>) => Promise<User>
}

// LINE integration (admin)
export type LineConversationStatus = 'open' | 'pending' | 'closed'

export interface LineConversation {
  userId: string
  displayName?: string
  pictureUrl?: string
  statusMessage?: string
  adminNote?: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  lastMessageAt?: string
  lastMessageText?: string
  unreadCount?: number
  status?: LineConversationStatus
  createdAt?: string
  updatedAt?: string
}

export type LineMessageDirection = 'in' | 'out'

export type LineMessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'unknown'

export interface LineMessage {
  id: string
  userId: string
  direction: LineMessageDirection
  type: LineMessageType
  text?: string
  mediaUrl?: string
  mediaBucket?: string
  mediaContentType?: string
  mediaSize?: number
  mediaFileName?: string
  mediaToken?: string
  timestamp: string
  raw?: Record<string, unknown>
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

// Service Plan types (Firestore-managed)
export interface ServicePlan {
  id: string // e.g., 'plan-2d', 'plan-3d', 'plan-4d'
  type: '2D' | '3D' | '4D' | 'wax' | string
  name: string
  description: string
  price: number
  monitorPrice?: number
  otherShopPrice?: number
  duration: number // in minutes
  image?: string
  badge?: string
  isFeatured?: boolean
  tags?: string[]
  isPublished: boolean
  effectiveFrom: string // ISO date string
  effectiveUntil?: string // ISO date string
  displayOrder: number
  createdAt: Date | string
  updatedAt: Date | string
}

// Announcement types
export interface Announcement {
  id: string
  title: string
  body: string
  publishAt: string // ISO date string
  expiresAt?: string // ISO date string
  isPinned: boolean
  priority: number // Higher number = higher priority
  createdAt: Date | string
  updatedAt: Date | string
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
  requiredDurationMinutes?: number
}

// Business hours and settings
export interface BusinessHours {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  open: string // "09:00"
  close: string // "17:00"
  isOpen: boolean
  allowedSlots?: string[]
  alternateSlotSets?: string[][]
  slots?: TimeSlot[]
  allowMultipleSlots?: boolean // 複数予約枠を許可するか
  slotInterval?: number // スロット間隔（分）、allowMultipleSlotsがtrueの場合のみ使用
  maxCapacityPerDay?: number // 1日の最大受付人数（デフォルト: 1）
}

export interface ReservationDateOverride {
  allowedSlots?: string[]
}

export interface ReservationSettings {
  slotDuration: number // in minutes
  maxCapacityPerSlot: number
  businessHours: BusinessHours[]
  blockedDates?: string[] // ISO date strings
  dateOverrides?: Record<string, ReservationDateOverride>
  cancellationDeadlineHours?: number // キャンセル可能期限（予約日の何時間前まで）
  cancellationPolicy?: string // キャンセルポリシーのテキスト
}

// Chart and Analytics types
export interface ChartData {
  month: string
  revenue: number
  count: number
}

export interface ServiceChartData {
  name: string
  revenue: number
  count: number
  value: number
}

export interface TierChartData {
  name: string
  value: number
  fill: string
  [key: string]: string | number
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
  status: Reservation['status']
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
  isMonitorPrice?: boolean // モニター価格を選択した場合true
  isMonitorSelected?: boolean
  intakeForm?: ReservationIntakeForm
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
