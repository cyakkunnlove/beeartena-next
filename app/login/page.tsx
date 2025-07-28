'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login(formData.email, formData.password)
      // 管理者の場合は管理画面へ、一般ユーザーの場合はマイページへ
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/mypage')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

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

          <div className="text-center text-sm text-gray-600">
            <p>
              デモアカウント（顧客）：
              <br />
              メール: yamada@example.com
              <br />
              パスワード: password123
            </p>
          </div>
        </form>

        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">管理者アカウント：</p>
          <p className="text-xs text-gray-500">
            メール: admin@beeartena.jp
            <br />
            パスワード: admin123
          </p>
        </div>
      </div>
    </div>
  )
}
