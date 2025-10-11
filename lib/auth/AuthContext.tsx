'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

import { POINTS_PROGRAM_ENABLED } from '@/lib/constants/featureFlags'
import { apiClient } from '@/lib/api/client'
import { User, AuthContextType } from '@/lib/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const normalizeUserResponse = (data: Record<string, unknown>): User => {
    const createdAtValue = data.createdAt ?? data.created_at
    const updatedAtValue = data.updatedAt ?? data.updated_at

    const toDate = (value: unknown): Date => {
      if (value instanceof Date) return value
      if (typeof value === 'string') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed
      }
      return new Date()
    }

    const roleValue = data.role === 'admin' ? 'admin' : 'customer'

    return {
      id: String(data.id ?? data.userId ?? ''),
      email: String(data.email ?? ''),
      name: String(data.name ?? ''),
      phone: String(data.phone ?? ''),
      role: roleValue,
      points: typeof data.points === 'number' ? data.points : undefined,
      birthday: typeof data.birthday === 'string' ? data.birthday : undefined,
      createdAt: toDate(createdAtValue),
      updatedAt: toDate(updatedAtValue),
    }
  }

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const currentUser = await apiClient.getCurrentUser()
          if (currentUser && typeof currentUser === 'object') {
            setUser(normalizeUserResponse(currentUser))
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // トークンが無効な場合はクリア
        apiClient.clearToken()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const userResponse = await apiClient.login(email, password)
    const normalizedUser = normalizeUserResponse(userResponse as Record<string, unknown>)
    setUser(normalizedUser)

    // 誕生日ポイントチェック（非同期で実行）
    if (POINTS_PROGRAM_ENABLED && normalizedUser.role === 'customer') {
      void apiClient.triggerBirthdayPoints(normalizedUser.id)
    }

    return normalizedUser
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    birthday?: string,
  ): Promise<User> => {
    const userResponse = await apiClient.register({ email, password, name, phone, birthday })
    const normalizedUser = normalizeUserResponse(userResponse as Record<string, unknown>)
    setUser(normalizedUser)
    return normalizedUser
  }

  const logout = async () => {
    await apiClient.logout()
    setUser(null)
  }

  const updateProfile = async (updates: Record<string, unknown>): Promise<User> => {
    if (!user) throw new Error('ユーザーがログインしていません')
    const updatedResponse = await apiClient.updateProfile(updates)
    const normalizedUser = normalizeUserResponse(updatedResponse as Record<string, unknown>)
    setUser(normalizedUser)
    return normalizedUser
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
