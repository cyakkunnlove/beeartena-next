'use client'

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

import { POINTS_PROGRAM_ENABLED } from '@/lib/constants/featureFlags'
import { apiClient } from '@/lib/api/client'
import { User, AuthContextType } from '@/lib/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkingRef = useRef(false)

  const normalizeUserResponse = (data: Record<string, unknown>): User => {
    const createdAtValue = data.createdAt ?? data.created_at
    const updatedAtValue = data.updatedAt ?? data.updated_at
    const termsAcceptedAtValue = data.termsAcceptedAt ?? data.terms_accepted_at
    const privacyAcceptedAtValue = data.privacyAcceptedAt ?? data.privacy_accepted_at

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
      termsAcceptedAt: termsAcceptedAtValue ? toDate(termsAcceptedAtValue) : undefined,
      privacyAcceptedAt: privacyAcceptedAtValue ? toDate(privacyAcceptedAtValue) : undefined,
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      if (checkingRef.current) return
      checkingRef.current = true
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (token) {
          const currentUser = await apiClient.getCurrentUser()
          if (currentUser && typeof currentUser === 'object') {
            setUser(normalizeUserResponse(currentUser))
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // トークンが無効な場合はクリア
        apiClient.clearToken()
        setUser(null)
      } finally {
        setLoading(false)
        checkingRef.current = false
      }
    }

    const onTokenChanged = () => {
      void checkAuth()
    }

    window.addEventListener('beeartena:auth-token-changed', onTokenChanged)
    void checkAuth()

    return () => {
      window.removeEventListener('beeartena:auth-token-changed', onTokenChanged)
    }
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
