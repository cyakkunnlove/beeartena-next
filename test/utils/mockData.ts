export const mockTimeSlots = [
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '12:00', available: false },
  { time: '13:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: false },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
]

export const mockReservation = {
  id: 'test-reservation-id',
  customerId: 'test-customer-id',
  serviceId: 'test-service-id',
  serviceName: 'テストサービス',
  date: '2025-08-01',
  time: '10:00',
  duration: 60,
  price: 5000,
  status: 'confirmed' as const,
  pointsUsed: 0,
  formData: {
    name: 'テスト太郎',
    email: 'test@example.com',
    phone: '090-1234-5678',
    notes: 'テストメモ',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'customer' as const,
  name: 'テストユーザー',
  phone: '090-1234-5678',
  postalCode: '100-0001',
  address: '東京都千代田区千代田1-1',
  birthDate: '1990-01-01',
  points: 100,
  totalSpent: 50000,
  visitCount: 10,
  lastVisit: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockService = {
  id: 'test-service-id',
  name: 'テストサービス',
  description: 'テストサービスの説明',
  price: 5000,
  duration: 60,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}