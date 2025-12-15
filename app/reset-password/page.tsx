'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  const oobCode = searchParams.get('oobCode')

  useEffect(() => {
    if (!oobCode) {
      setError('無効なリンクです')
      setIsVerifying(false)
      return
    }

    // リセットコードの検証
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email)
        setIsVerifying(false)
      })
      .catch((error) => {
        console.error('Verification error:', error)
        setError('リンクが無効または期限切れです')
        setIsVerifying(false)
      })
  }, [oobCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    if (!oobCode) {
      setError('無効なリンクです')
      return
    }

    setIsLoading(true)

    try {
      await confirmPasswordReset(auth, oobCode, password)
      setIsSuccess(true)
    } catch (error: any) {
      console.error('Password reset error:', error)

      if (error.code === 'auth/expired-action-code') {
        setError('リンクの有効期限が切れています。もう一度パスワードリセットをお試しください')
      } else if (error.code === 'auth/invalid-action-code') {
        setError('無効なリンクです。もう一度パスワードリセットをお試しください')
      } else if (error.code === 'auth/weak-password') {
        setError('パスワードが弱すぎます。より強力なパスワードを設定してください')
      } else {
        setError('パスワードのリセットに失敗しました')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-light-accent">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">確認中...</p>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-light-accent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                パスワードをリセットしました
              </h2>
              <p className="text-gray-600 mb-8">
                新しいパスワードでログインできます
              </p>
              <Link
                href="/login"
                className="inline-block w-full btn btn-primary"
              >
                ログインページへ
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-light-accent py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                エラーが発生しました
              </h2>
              <p className="text-gray-600 mb-8">{error}</p>
              <Link
                href="/forgot-password"
                className="inline-block text-primary hover:text-primary/80 font-medium"
              >
                パスワードリセットをやり直す
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-light-accent py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            新しいパスワードを設定
          </h1>
          {email && (
            <p className="mt-2 text-gray-600">
              アカウント: <strong>{email}</strong>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                新しいパスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                8文字以上で入力してください
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary btn-large disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '設定中...' : 'パスワードを設定'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
