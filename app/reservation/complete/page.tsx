'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'

export default function ReservationCompletePage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // ログインしていない場合はトップページへ
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.9, 1.1, 1], opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner"
            >
              <svg
                className="w-12 h-12 text-green-600"
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
            </motion.div>

            <h1 className="text-3xl font-bold mb-4">ご予約ありがとうございました</h1>
            
            <div className="text-gray-600 mb-8 space-y-2">
              <p>予約が正常に完了しました。</p>
              <p>確認メールをお送りしましたのでご確認ください。</p>
              <motion.p
                className="text-lg text-primary font-semibold mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
              >
                あなたが理想の美しさに出会う瞬間を、スタッフ一同心から楽しみにしています。
              </motion.p>
              <p className="text-sm mt-2">
                ※メールが届かない場合は、迷惑メールフォルダをご確認いただくか、
                お電話にてお問い合わせください。
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold mb-4">ご予約内容</h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  詳細な予約内容は確認メールに記載されています。
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-yellow-800 mb-2">ご来店前のお願い</h3>
              <ul className="text-sm text-yellow-700 space-y-1 text-left">
                <li>• 施術当日は、眉毛周りのメイクはお控えください</li>
                <li>• 予約時間の5分前にはお越しください</li>
                <li>• キャンセルの場合はご予約の3日前（72時間前）までにご連絡ください</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/mypage/reservations"
                className="block w-full bg-primary text-white text-center py-3 rounded-lg hover:bg-dark-gold transition-colors"
              >
                予約詳細を確認する
              </Link>
              
              <Link
                href="/"
                className="block w-full bg-gray-200 text-gray-700 text-center py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                トップページへ戻る
              </Link>
            </div>

            <div className="mt-8 pt-8 border-t">
              <p className="text-sm text-gray-600 mb-2">ご不明な点がございましたら</p>
              <div className="flex justify-center items-center gap-4">
                <a
                  href="tel:090-5278-5221"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  090-5278-5221
                </a>
                <span className="text-gray-400">|</span>
                <a
                  href="https://line.me/R/ti/p/@174geemy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LINE相談
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
