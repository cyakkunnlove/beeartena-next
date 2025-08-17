'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import SlideTransition from '@/components/layout/SlideTransition'

export default function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* 動画背景 */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute w-full h-full object-cover"
        >
          <source src="/videos/hero-background.mp4" type="video/mp4" />
        </video>
        {/* オーバーレイ - グラデーション効果を追加 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      </div>

      {/* コンテンツ */}
      <ResponsiveContainer maxWidth="xl" className="relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <SlideTransition direction="up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8">
              <span className="text-white drop-shadow-lg block">
                理容師が創る、
                <br className="sm:hidden" />
                あなただけの美眉
              </span>
              <span className="text-2xl sm:text-3xl md:text-4xl text-white/90 font-normal mt-4 sm:mt-6 block">
                1日1名限定のプレミアムタトゥーメイク
              </span>
            </h1>
          </SlideTransition>
          
          <SlideTransition direction="up" delay={0.1}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-10 drop-shadow-md">
              国家資格を持つ理容師による安全・安心の施術
              <br className="hidden sm:block" />
              <span className="block sm:inline">3ヶ月以内リタッチ11,000円の安心プラン</span>
            </p>
          </SlideTransition>
          
          <SlideTransition direction="up" delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                <Link
                  href="/reservation"
                  className="btn btn-primary w-full sm:w-auto text-center text-lg px-8 py-4 shadow-lg"
                  aria-label="予約ページへ移動"
                >
                  今すぐ予約する
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                <Link
                  href="/pricing"
                  className="btn btn-secondary w-full sm:w-auto text-center text-lg px-8 py-4 shadow-lg bg-white/90 hover:bg-white"
                  aria-label="料金メニューページへ移動"
                >
                  メニューを見る
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                <Link
                  href="/login"
                  className="btn btn-outline w-full sm:w-auto text-center text-lg px-8 py-4 shadow-lg border-white text-white hover:bg-white hover:text-primary"
                  aria-label="会員登録ページへ移動"
                >
                  会員登録（5%ポイント還元）
                </Link>
              </motion.div>
            </div>
          </SlideTransition>
        </div>
      </ResponsiveContainer>
    </section>
  )
}
