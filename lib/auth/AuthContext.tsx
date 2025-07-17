'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/lib/types';
import { authService } from '@/lib/auth/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const user = await authService.login(email, password);
    setUser(user);
    return user;
  };

  const register = async (email: string, password: string, name: string, phone: string): Promise<User> => {
    const user = await authService.register(email, password, name, phone);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (!user) throw new Error('ユーザーがログインしていません');
    const updatedUser = await authService.updateProfile(user.id, updates);
    setUser(updatedUser);
    return updatedUser;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}