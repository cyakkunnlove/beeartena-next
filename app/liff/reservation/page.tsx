'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { firebaseAuth } from '@/lib/firebase/auth'
import { auth } from '@/lib/firebase/config'
import { apiClient } from '@/lib/api/client'
import { isProfileComplete } from '@/lib/utils/profileUtils'

declare global {
  interface Window {
    liff?: {
      init: (options: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      login: (options?: { redirectUri?: string }) => void
      getIDToken: () => string | null
    }
  }
}

const LIFF_SDK_URL = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

export default function LiffReservationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [status, setStatus] = useState<'init' | 'redirect' | 'auth' | 'done' | 'error'>('init')
  const [error, setError] = useState('')

  const liffId = (process.env.NEXT_PUBLIC_LIFF_ID || '').trim()
  const redirectTarget = useMemo(() => {
    const raw = searchParams.get('redirect') || '/reservation'
    return raw.startsWith('/') ? raw : '/reservation'
  }, [searchParams])

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
      router.replace(`/complete-profile?redirect=${encodeURIComponent(target)}${reservationParam}`)
      return
    }

    router.replace(target)
  }

  const startLiffLogin = async () => {
    if (!window.liff) return

    if (!liffId) {
      setError('LIFF IDが設定されていません')
      setStatus('error')
      return
    }

    try {
      await window.liff.init({ liffId })

      if (!window.liff.isLoggedIn()) {
        setStatus('redirect')
        window.liff.login({ redirectUri: window.location.href })
        return
      }

      const idToken = window.liff.getIDToken()
      if (!idToken) {
        setError('LINEのログイン情報が取得できませんでした')
        setStatus('error')
        return
      }

      setStatus('auth')
      await firebaseAuth.signInWithLineIdToken(idToken)
      await completeLogin(redirectTarget)
      setStatus('done')
    } catch (err: any) {
      console.error('LIFF login error:', err)
      setError(err?.message || 'LINEログインに失敗しました')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    if (!window.liff) return
    startedRef.current = true
    void startLiffLogin()
  }, [redirectTarget])

  return (
    <div className="min-h-screen bg-light-accent flex items-center justify-center px-4">
      <Script src={LIFF_SDK_URL} strategy="afterInteractive" onLoad={() => void startLiffLogin()} />
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-md space-y-3">
        {status === 'init' && <p className="text-sm text-gray-600">LINEログインを準備しています…</p>}
        {status === 'redirect' && <p className="text-sm text-gray-600">LINEログインに移動します…</p>}
        {status === 'auth' && <p className="text-sm text-gray-600">ログイン処理中…</p>}
        {status === 'done' && <p className="text-sm text-gray-600">予約ページへ移動します…</p>}
        {status === 'error' && (
          <>
            <p className="text-sm text-red-600">LINEログインに失敗しました</p>
            <p className="text-xs text-gray-500">{error}</p>
          </>
        )}
      </div>
    </div>
  )
}
