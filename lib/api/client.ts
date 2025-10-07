const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<T> {
    const url = API_BASE_URL ? `${API_BASE_URL}/api${endpoint}` : `/api${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401 && requireAuth) {
      // 認証エラーの場合はトークンをクリア
      this.clearToken()
      window.location.href = '/login'
      throw new Error('認証が必要です')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'リクエストに失敗しました')
    }

    return data
  }

  // 認証関連
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    this.setToken(response.token)
    return response.user
  }

  async register(data: {
    email: string
    password: string
    name: string
    phone: string
    birthday?: string
  }) {
    const response = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    this.setToken(response.token)
    return response.user
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' })
    this.clearToken()
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me')
  }

  async getAdminStats() {
    return this.request<{
      stats: {
        totalCustomers: number
        totalReservations: number
        pendingReservations: number
        totalRevenue: number
        todayReservations: number
        monthlyRevenue: number
        unreadInquiries: number
        activeCustomers: number
      }
    }>('/admin/stats', { cache: 'no-store' })
  }

  async updateProfile(data: any) {
    return this.request<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 予約関連
  async getReservations() {
    return this.request<any[]>('/reservations')
  }

  async getReservation(id: string) {
    return this.request<any>(`/reservations/${id}`)
  }

  async createReservation(data: any) {
    return this.request<any>(
      '/reservations',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    ) // 認証を必須としない
  }

  async updateReservation(id: string, action: 'confirm' | 'complete' | 'cancel', reason?: string) {
    return this.request<any>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    })
  }

  async cancelReservation(id: string, reason?: string) {
    return this.request<any>(`/reservations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    })
  }

  async getTimeSlots(date: string) {
    return this.request<any[]>(`/reservations/slots?date=${date}`, {}, false) // 認証を必須としない
  }

  // ポイント関連
  async getPoints(userId?: string) {
    const params = userId ? `?userId=${userId}` : ''
    return this.request<{ balance: number; history: any[]; warning?: string }>(`/points${params}`)
  }

  async getPointBalance() {
    return this.request<{ balance: number }>('/points/balance')
  }

  async triggerBirthdayPoints(userId: string) {
    try {
      const response = await this.request<{ granted?: boolean }>('/points/birthday', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })
      return response?.granted ?? false
    } catch (error: any) {
      // 認証エラーや未設定環境ではポイント付与をスキップ
      console.debug('Birthday points trigger skipped', { error: error?.message || error })
      return false
    }
  }

  async addPoints(userId: string, amount: number, description: string) {
    return this.request<any>('/points', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description, type: 'add' }),
    })
  }

  async usePoints(userId: string, amount: number, description: string) {
    return this.request<any>('/points', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description, type: 'use' }),
    })
  }

  // 顧客関連
  async getCustomers() {
    return this.request<any[]>('/customers')
  }

  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`)
  }

  async updateCustomer(id: string, data: any) {
    return this.request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 問い合わせ関連
  async getInquiries() {
    return this.request<any[]>('/inquiries')
  }

  async getInquiry(id: string) {
    return this.request<any>(`/inquiries/${id}`)
  }

  async createInquiry(data: {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
  }) {
    return this.request<any>(
      '/inquiries',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false,
    ) // 認証を必須としない
  }

  async updateInquiry(id: string, data: { status?: string; reply?: string }) {
    return this.request<any>(`/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  async deleteAccount(password: string) {
    return this.request<any>('/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    })
  }
}

export const apiClient = new ApiClient()
