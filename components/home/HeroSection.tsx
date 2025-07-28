'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SlideTransition from '@/components/layout/SlideTransition'
import LazyImage from '@/components/ui/LazyImage'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'

export default function HeroSection() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-light-accent to-white py-12 sm:py-16 md:py-20">
      <ResponsiveContainer maxWidth="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-center lg:text-left">
            <SlideTransition direction="right">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                <span className="text-gradient block">理容師が創る、あなただけの美眉</span>
                <span className="text-xl sm:text-2xl md:text-3xl text-gray-700 font-normal mt-2 sm:mt-4 block">
                  1日1名限定のプレミアムタトゥーメイク
                </span>
              </h1>
            </SlideTransition>
            <SlideTransition direction="right" delay={0.1}>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8">
                国家資格を持つ理容師による安全・安心の施術
                <br className="hidden sm:block" />
                <span className="block sm:inline">半年以内リタッチ11,000円の安心プラン</span>
              </p>
            </SlideTransition>
            <SlideTransition direction="up" delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                  <Link
                    href="/reservation"
                    className="btn btn-primary w-full sm:w-auto text-center"
                    aria-label="予約ページへ移動"
                  >
                    今すぐ予約する
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                  <Link
                    href="/pricing"
                    className="btn btn-secondary w-full sm:w-auto text-center"
                    aria-label="料金メニューページへ移動"
                  >
                    メニューを見る
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                  <Link
                    href="/login"
                    className="btn btn-outline w-full sm:w-auto text-center"
                    aria-label="会員登録ページへ移動"
                  >
                    会員登録（5%ポイント還元）
                  </Link>
                </motion.div>
              </div>
            </SlideTransition>
          </div>

          <SlideTransition direction="left" delay={0.3}>
            <div className="relative">
              <div className="before-after">
                <motion.div
                  className="before-after-item"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <LazyImage
                    src="/images/topimagebefore.png"
                    alt="施術前の眉の状態"
                    width={300}
                    height={300}
                    className="rounded-xl shadow-lg w-full h-auto"
                    priority={true}
                  />
                  <span className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-semibold">
                    Before
                  </span>
                </motion.div>
                <motion.div
                  className="before-after-arrow"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  →
                </motion.div>
                <motion.div
                  className="before-after-item"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <LazyImage
                    src="/images/topimageafter.png"
                    alt="施術後の眉の状態"
                    width={300}
                    height={300}
                    className="rounded-xl shadow-lg w-full h-auto"
                    priority={true}
                  />
                  <span className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-semibold">
                    After
                  </span>
                </motion.div>
              </div>
            </div>
          </SlideTransition>
        </div>
      </ResponsiveContainer>
    </section>
  )
}
