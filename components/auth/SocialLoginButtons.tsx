'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { firebaseAuth } from '@/lib/firebase/auth'
import { isProfileComplete } from '@/lib/utils/profileUtils'

interface SocialLoginButtonsProps {
  redirectTo?: string
}

export default function SocialLoginButtons({ redirectTo = '/mypage' }: SocialLoginButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const user = await firebaseAuth.signInWithGoogle()

      // プロフィールが未完成の場合は補完ページへ
      if (!isProfileComplete(user)) {
        // 元のリダイレクト先を保持して補完ページへ
        router.push(`/complete-profile?redirect=${encodeURIComponent(redirectTo)}`)
      } else {
        // プロフィールが完成している場合は通常のリダイレクト
        router.push(redirectTo)
      }
    } catch (error: any) {
      console.error('Googleログインエラー:', error)
      setError(error.message || 'Googleログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">または</span>
        </div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FcGoogle className="text-xl" />
        <span>{loading ? 'ログイン中...' : 'Googleでログイン'}</span>
      </button>
    </div>
  )
}