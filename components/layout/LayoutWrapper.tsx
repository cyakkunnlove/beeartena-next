'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import PWAInstallPrompt, { useServiceWorker } from '@/components/pwa/PWAInstallPrompt'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { createContext, useContext } from 'react'

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
  const { updateAvailable, updateServiceWorker } = useServiceWorker()

  // サービスワーカーのアップデート通知
  if (updateAvailable) {
    toast.showToast({
      type: 'info',
      title: '新しいバージョンが利用可能です',
      message: 'ページを更新して最新版をご利用ください',
      duration: 0, // 自動で消えない
    })
  }

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
