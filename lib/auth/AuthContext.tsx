'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

import { apiClient } from '@/lib/api/client'
import { User, AuthContextType } from '@/lib/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const currentUser = await apiClient.getCurrentUser()
          setUser(currentUser)
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
    const user = await apiClient.login(email, password)
    setUser(user)

    // 誕生日ポイントチェック（非同期で実行）
    if (user.role === 'customer') {
      import('@/lib/services/birthdayPoints').then(({ birthdayPointsService }) => {
        birthdayPointsService.checkAndGrantBirthdayPoints(user.id).then((granted) => {
          if (granted) {
            // Birthday points granted!
          }
        })
      })
    }

    return user
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    birthday?: string,
  ): Promise<User> => {
    const user = await apiClient.register({ email, password, name, phone, birthday })
    setUser(user)
    return user
  }

  const logout = async () => {
    await apiClient.logout()
    setUser(null)
  }

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (!user) throw new Error('ユーザーがログインしていません')
    const updatedUser = await apiClient.updateCustomer(user.id, updates)
    setUser(updatedUser)
    return updatedUser
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
