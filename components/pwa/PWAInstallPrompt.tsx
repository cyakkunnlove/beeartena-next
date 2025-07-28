'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/outline'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check localStorage to see if user dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true') {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        // User accepted the install prompt
      } else {
        // User dismissed the install prompt
      }

      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt || isInstalled || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-40 animate-slide-in-right">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <PlusCircleIcon className="w-8 h-8 text-primary" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">アプリをインストール</h3>
          <p className="text-sm text-gray-600 mb-3">
            BEE ART ENAをホーム画面に追加して、より快適にご利用いただけます
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-dark-gold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              aria-label="アプリをインストール"
            >
              インストール
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-lg"
              aria-label="閉じる"
            >
              後で
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Service Worker Registration Hook
export const useServiceWorker = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Handle controller change
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return { registration, updateAvailable, updateServiceWorker }
}

export default PWAInstallPrompt
