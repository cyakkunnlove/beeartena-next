import React, { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />
      case 'warning':
        return <ExclamationCircleIcon className="w-6 h-6 text-yellow-500" />
      case 'info':
      default:
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />
    }
  }

  const getStyles = () => {
    const baseStyles =
      'flex items-start gap-3 w-full max-w-sm p-4 bg-white rounded-lg shadow-lg border'
    const typeStyles = {
      success: 'border-green-200',
      error: 'border-red-200',
      warning: 'border-yellow-200',
      info: 'border-blue-200',
    }

    return `${baseStyles} ${typeStyles[toast.type]} ${
      isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
    }`
  }

  return (
    <div className={getStyles()} role="alert" aria-live="polite" aria-atomic="true">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{toast.title}</h3>
        {toast.message && <p className="mt-1 text-sm text-gray-500">{toast.message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
        aria-label="閉じる"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

// Toast Container Component
export const ToastContainer: React.FC<{
  toasts: ToastMessage[]
  onClose: (id: string) => void
}> = ({ toasts, onClose }) => {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return {
    toasts,
    showToast,
    removeToast,
  }
}

export default Toast
