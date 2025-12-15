'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'

export default function PointsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [router, user])

  return (
    <div className="bg-white rounded-xl shadow-md p-6 text-center">
      <h1 className="text-xl font-bold">このページは現在ご利用いただけません</h1>
      <p className="mt-2 text-sm text-gray-600">ご不便をおかけします。マイページへ戻ってください。</p>
      <div className="mt-6">
        <Link href="/mypage" className="btn btn-primary">
          マイページへ戻る
        </Link>
      </div>
    </div>
  )
}
