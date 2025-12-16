'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import { isApiError } from '@/lib/api/client'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [errorMeta, setErrorMeta] = useState<{
    code?: string
    requestId?: string
    hint?: string
    retryAfterSeconds?: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)

  useEffect(() => {
    setIsDevelopment(process.env.NODE_ENV === 'development')
  }, [])

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/reservation')
      }
    }
  }, [user, loading, router])

  // 予約から来た場合のリダイレクト先を決定
  const fromReservation = searchParams.get('reservation') === 'true'
  const redirectTo = fromReservation ? '/reservation?from=login' : '/reservation'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrorMeta(null)
    setIsLoading(true)

    try {
      const user = await login(formData.email, formData.password)
      // 管理者の場合は管理画面へ、一般ユーザーの場合は指定されたリダイレクト先へ
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push(redirectTo)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ログインに失敗しました'
      setError(message)

      if (isApiError(err)) {
        const retryAfterSeconds =
          typeof err.meta?.retryAfterMs === 'number' ? Math.ceil(err.meta.retryAfterMs / 1000) : undefined
        const hint = (() => {
          switch (err.code) {
            case 'AUTH_INVALID_CREDENTIALS':
              return 'メールアドレスとパスワードをご確認ください。'
            case 'RATE_LIMITED':
            case 'AUTH_RATE_LIMITED':
              return retryAfterSeconds ? `${retryAfterSeconds}秒ほど待ってからお試しください。` : 'しばらく待ってからお試しください。'
            case 'AUTH_SERVER_MISCONFIG':
            case 'AUTH_SERVER_ERROR':
              return '時間をおいても改善しない場合は、管理者へお問い合わせください。'
            default:
              return '入力内容・通信環境をご確認のうえ、再度お試しください。'
          }
        })()

        setErrorMeta({
          code: err.code,
          requestId: err.requestId,
          hint,
          retryAfterSeconds,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-light-accent py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gradient">会員ログイン</h1>
          <p className="mt-2 text-gray-600">
            アカウントをお持ちでない方は
            <Link href="/register" className="text-primary hover:text-dark-gold ml-1">
              新規登録
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm space-y-1">
              <div>{error}</div>
              {errorMeta?.hint && <div className="text-xs text-red-600">{errorMeta.hint}</div>}
              {(errorMeta?.code || errorMeta?.requestId) && (
                <div className="text-[11px] text-red-600/80">
                  {errorMeta.code ? <>code: {errorMeta.code}</> : null}
                  {errorMeta.code && errorMeta.requestId ? ' / ' : null}
                  {errorMeta.requestId ? <>id: {errorMeta.requestId}</> : null}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="input-group">
              <label htmlFor="email" className="input-label">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="example@email.com"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm text-primary hover:text-dark-gold">
              パスワードを忘れた方
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary btn-large disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>

          <SocialLoginButtons redirectTo={redirectTo} />
        </form>

        {isDevelopment && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">管理者アカウント：</p>
            <p className="text-xs text-gray-500">
              メール: admin@beeartena.jp
              <br />
              パスワード: 環境変数ADMIN_PASSWORDを参照
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
