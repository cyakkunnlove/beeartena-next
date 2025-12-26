'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { SiLine } from 'react-icons/si'
import { firebaseAuth } from '@/lib/firebase/auth'
import { auth } from '@/lib/firebase/config'
import { apiClient, isApiError } from '@/lib/api/client'
import { isProfileComplete } from '@/lib/utils/profileUtils'

interface SocialLoginButtonsProps {
  redirectTo?: string
}

export default function SocialLoginButtons({ redirectTo = '/mypage' }: SocialLoginButtonsProps) {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'line' | null>(null)
  const [error, setError] = useState('')
  const redirectStorageKey = 'social_login_redirect_to'

  const resolveRedirectTarget = () => {
    if (typeof window === 'undefined') return redirectTo
    try {
      const stored = sessionStorage.getItem(redirectStorageKey)
      if (stored) {
        sessionStorage.removeItem(redirectStorageKey)
        return stored
      }
    } catch {
      // sessionStorageが使えない環境ではそのまま
    }
    return redirectTo
  }

  const completeLogin = async (target: string) => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser) {
      throw new Error('ログインに失敗しました（ユーザー情報が取得できません）')
    }

    const idToken = await firebaseUser.getIdToken()
    const user = await apiClient.loginWithFirebaseIdToken(idToken)

    if (!isProfileComplete(user)) {
      const needsReservationFlag = target.startsWith('/reservation')
      const reservationParam = needsReservationFlag ? '&reservation=true' : ''
      router.push(`/complete-profile?redirect=${encodeURIComponent(target)}${reservationParam}`)
    } else {
      router.push(target)
    }
  }

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const handled = await firebaseAuth.handleRedirectResult()
        if (!handled) return
        const target = resolveRedirectTarget()
        await completeLogin(target)
      } catch (error: any) {
        console.error('リダイレクトログインエラー:', error)
        const message = error?.message || 'リダイレクトログインに失敗しました'
        if (typeof message === 'string' && message.includes('missing initial state')) {
          try {
            sessionStorage.removeItem(redirectStorageKey)
          } catch {
            // noop
          }
          return
        }
        setError(message)
      } finally {
        setLoadingProvider(null)
      }
    }

    void handleRedirect()
  }, [redirectTo])

  const handleSocialLogin = async (provider: 'google' | 'line') => {
    try {
      setLoadingProvider(provider)
      setError('')

      if (provider === 'google') {
        await firebaseAuth.signInWithGoogle()
      } else {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
        const isLineInApp = ua.includes('line')
        const liffId = (process.env.NEXT_PUBLIC_LIFF_ID || '').trim()

        if (isLineInApp) {
          if (liffId) {
            const liffUrl = `https://liff.line.me/${liffId}?redirect=${encodeURIComponent(redirectTo)}`
            window.location.href = liffUrl
            return
          }
          throw new Error('LINEアプリ内ログインに必要な設定が未完了です（LIFF ID未設定）')
        }

        try {
          sessionStorage.setItem(redirectStorageKey, redirectTo)
        } catch {
          throw new Error('このブラウザではLINEログインができません。別ブラウザでお試しください。')
        }
        await firebaseAuth.signInWithLineRedirect()
        return
      }

      const target = resolveRedirectTarget()
      await completeLogin(target)
    } catch (error: any) {
      const label = provider === 'google' ? 'Google' : 'LINE'
      console.error(`${label}ログインエラー:`, error)
      const message = error?.message || `${label}ログインに失敗しました`
      if (isApiError(error)) {
        const hint = (() => {
          switch (error.code) {
            case 'AUTH_FIREBASE_TOKEN_INVALID':
              return `${label}ログインをやり直してください。`
            case 'AUTH_SERVER_MISCONFIG':
            case 'AUTH_SERVER_ERROR':
              return '時間をおいても改善しない場合は、管理者へお問い合わせください。'
            case 'RATE_LIMITED':
              return 'しばらく待ってからお試しください。'
            default:
              return '通信環境をご確認のうえ、再度お試しください。'
          }
        })()

        const suffix = error.requestId ? `（id: ${error.requestId}）` : ''
        setError(`${message}${suffix}\n${hint}`)
      } else {
        setError(message)
      }
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleGoogleLogin = () => handleSocialLogin('google')
  const handleLineLogin = () => handleSocialLogin('line')

  const isLoading = loadingProvider !== null

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
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
        onClick={handleLineLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#06C755] text-white hover:bg-[#05B84D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiLine className="text-xl" />
        <span>{loadingProvider === 'line' ? 'LINEログイン中...' : 'LINEでログイン'}</span>
      </button>

      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FcGoogle className="text-xl" />
        <span>{loadingProvider === 'google' ? 'ログイン中...' : 'Googleでログイン'}</span>
      </button>
    </div>
  )
}
