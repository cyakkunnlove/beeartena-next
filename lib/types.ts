// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer extends User {
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    prefecture?: string;
    postalCode?: string;
  };
  notes?: string;
  tags?: string[];
}

// Points types
export interface Points {
  userId: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tierExpiry?: Date;
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  amount: number;
  balance: number;
  description: string;
  referenceId?: string;
  createdAt: Date;
}

// Reservation types
export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: '2D' | '3D' | '4D';
  serviceName: string;
  price: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Inquiry types
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'general' | 'menu' | 'booking' | 'aftercare' | 'other';
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: Date;
  updatedAt: Date;
}

// Auth types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, phone: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

// Service types
export interface Service {
  id: string;
  type: '2D' | '3D' | '4D';
  name: string;
  description: string;
  price: number;
  monitorPrice: number;
  duration: number; // in minutes
  image: string;
}

// Statistics types
export interface DashboardStats {
  totalCustomers: number;
  todayReservations: number;
  monthlyRevenue: number;
  totalReservations: number;
  customerGrowth: number;
  revenueGrowth: number;
}

// Time slot types
export interface TimeSlot {
  time: string;
  available: boolean;
}