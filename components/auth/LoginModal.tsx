'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/lib/auth/AuthContext'
import { isApiError } from '@/lib/api/client'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import type { User } from '@/lib/types'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (user: User) => void
  onRegister?: () => void
  defaultEmail?: string
  loadingMessage?: string
}

export default function LoginModal({
  open,
  onClose,
  onSuccess,
  onRegister,
  defaultEmail = '',
  loadingMessage = 'ログイン中...',
}: LoginModalProps) {
  const router = useRouter()
  const { login } = useAuth()
  const redirectTo = '/reservation?from=login'
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [errorMeta, setErrorMeta] = useState<{ code?: string; requestId?: string; hint?: string } | null>(null)

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail)
      setPassword('')
      setError('')
    }
  }, [open, defaultEmail])

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrorMeta(null)
    setIsLoading(true)

    try {
      const loggedInUser = await login(email, password)
      onSuccess?.(loggedInUser)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ログインに失敗しました'
      setError(message)
      if (isApiError(err)) {
        const hint = (() => {
          switch (err.code) {
            case 'AUTH_INVALID_CREDENTIALS':
              return 'メールアドレスとパスワードをご確認ください。'
            case 'RATE_LIMITED':
            case 'AUTH_RATE_LIMITED':
              return 'しばらく待ってからお試しください。'
            default:
              return '入力内容・通信環境をご確認のうえ、再度お試しください。'
          }
        })()
        setErrorMeta({ code: err.code, requestId: err.requestId, hint })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = () => {
    onRegister?.()
    onClose()
    router.push('/register?reservation=true')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">会員ログイン</h2>
            <p className="mt-1 text-sm text-gray-600">
              ログインすると登録済みの情報が自動入力されます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 space-y-1">
              <div>{error}</div>
              {errorMeta?.hint && <div className="text-xs text-red-600/90">{errorMeta.hint}</div>}
              {(errorMeta?.code || errorMeta?.requestId) && (
                <div className="text-[11px] text-red-600/80">
                  {errorMeta.code ? <>code: {errorMeta.code}</> : null}
                  {errorMeta.code && errorMeta.requestId ? ' / ' : null}
                  {errorMeta.requestId ? <>id: {errorMeta.requestId}</> : null}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700">
              パスワード
            </label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? loadingMessage : 'ログインする'}
          </button>
        </form>

        <div className="mt-4">
          <SocialLoginButtons redirectTo={redirectTo} />
        </div>

        <div className="mt-4 space-y-2 text-center text-xs text-gray-500">
          <button
            type="button"
            onClick={handleRegister}
            className="text-primary underline offset-2"
          >
            新規登録はこちら
          </button>
          <div>
            <Link href="/forgot-password" className="text-primary underline">
              パスワードをお忘れの方
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
