'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useRef } from 'react'

import ErrorBoundary from '@/components/error/ErrorBoundary'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import PWAInstallPrompt, { useServiceWorker } from '@/components/pwa/PWAInstallPrompt'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// Toast Context
const ToastContext = createContext<ReturnType<typeof useToast> | null>(null)

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within LayoutWrapper')
  }
  return context
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  const toast = useToast()
  const { updateAvailable, updateServiceWorker: _updateServiceWorker } = useServiceWorker()
  const updateToastShownRef = useRef(false)

  // サービスワーカーのアップデート通知
  useEffect(() => {
    if (!updateAvailable) {
      updateToastShownRef.current = false
      return
    }
    if (updateToastShownRef.current) {
      return
    }
    updateToastShownRef.current = true

    toast.showToast({
      type: 'info',
      title: '新しいバージョンが利用可能です',
      message: 'ページを更新して最新版をご利用ください',
      duration: 0, // 自動で消えない
    })
  }, [toast, updateAvailable])

  // 管理画面の場合はヘッダー、フッター、ボトムナビを表示しない
  if (isAdminPage) {
    return (
      <ToastContext.Provider value={toast}>
        <ErrorBoundary>
          {children}
          <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        </ErrorBoundary>
      </ToastContext.Provider>
    )
  }

  return (
    <ToastContext.Provider value={toast}>
      <ErrorBoundary>
        <Header />
        <main id="main-content" className="flex-grow pb-16 md:pb-0">
          {children}
        </main>
        <Footer className="hidden md:block" />
        <BottomNav />
        <PWAInstallPrompt />
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </ErrorBoundary>
    </ToastContext.Provider>
  )
}
