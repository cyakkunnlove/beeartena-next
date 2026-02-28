'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import PageTransition from '@/components/layout/PageTransition'
import SlideTransition from '@/components/layout/SlideTransition'
import MobileButton from '@/components/ui/MobileButton'
import { getServicePlans } from '@/lib/firebase/servicePlans'
import type { ServicePlan } from '@/lib/types'

const formatPrice = (price: number) => `¥${price.toLocaleString()}`

export default function PricingPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getServicePlans()
        const published = data
          .filter((p) => p.isPublished)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        setPlans(published)
      } catch (error) {
        console.error('Failed to load service plans:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <PageTransition>
      <div className="min-h-screen bg-light-accent">
        {/* ヒーロー */}
        <section className="bg-gradient-to-br from-primary/10 to-white py-16">
          <div className="container mx-auto px-4">
            <SlideTransition direction="up">
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-gradient">
                メニュー & 料金
              </h1>
              <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto">
                理容師による安心・安全な施術。
                お客様の骨格や表情に合わせた、あなただけの美眉をデザインします。
              </p>
            </SlideTransition>
          </div>
        </section>

        {/* 料金表 */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="max-w-4xl mx-auto space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-8 shadow-lg animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-10">
                {plans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className={`bg-white rounded-2xl shadow-xl overflow-hidden ${
                      plan.isFeatured ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {plan.badge && (
                      <div className="bg-primary text-white text-center py-2 font-semibold text-sm">
                        {plan.badge}
                      </div>
                    )}

                    <div className="p-8 lg:p-10">
                      {/* 画像 */}
                      {plan.image && (
                        <div className="relative h-56 md:h-72 -mx-8 -mt-10 lg:-mx-10 mb-8 overflow-hidden">
                          <Image
                            src={plan.image}
                            alt={plan.name}
                            fill
                            sizes="(min-width: 1024px) 50vw, 90vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                        </div>
                      )}

                      {/* ヘッダー */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                        <div>
                          <h2 className="text-2xl lg:text-3xl font-bold mb-2">{plan.name}</h2>
                          <p className="text-gray-600">{plan.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            ⏱ 所要時間：{plan.durationText ?? `${plan.duration}分`}
                          </p>
                          {plan.note && (
                            <p className="text-sm text-amber-600 mt-1">{plan.note}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-gray-500">通常価格</p>
                          <p className="text-3xl font-bold">{formatPrice(plan.price)}</p>
                        </div>
                      </div>

                      {/* 料金詳細 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* キャンペーン */}
                        {plan.campaignPrice != null && (
                          <div className="bg-pink-50 rounded-xl p-6 space-y-3">
                            <h3 className="font-semibold text-pink-700 flex items-center gap-2">
                              🎉 キャンペーン価格
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-700">1回目</span>
                                <span className="text-2xl font-bold text-pink-600">
                                  {formatPrice(plan.campaignPrice)}
                                </span>
                              </div>
                              {plan.campaignReferralDiscount != null && plan.campaignReferralDiscount > 0 && (
                                <div className="flex justify-between items-baseline text-sm">
                                  <span className="text-gray-600">紹介割引</span>
                                  <span className="font-semibold text-pink-500">
                                    さらに −{formatPrice(plan.campaignReferralDiscount)}
                                  </span>
                                </div>
                              )}
                              {plan.secondPrice != null && (
                                <div className="flex justify-between items-baseline border-t border-pink-200 pt-2">
                                  <span className="text-gray-700">2回目</span>
                                  <span className="text-xl font-bold text-pink-600">
                                    {formatPrice(plan.secondPrice)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* リタッチ */}
                        {(plan.retouchPrice3m != null || plan.retouchPrice6m != null) && (
                          <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                              🔄 リタッチ
                            </h3>
                            <div className="space-y-2">
                              {plan.retouchPrice3m != null && (
                                <div className="flex justify-between items-baseline">
                                  <span className="text-gray-700">3ヶ月以内</span>
                                  <span className="text-xl font-bold">{formatPrice(plan.retouchPrice3m)}</span>
                                </div>
                              )}
                              {plan.retouchPrice6m != null && (
                                <div className="flex justify-between items-baseline">
                                  <span className="text-gray-700">6ヶ月以内</span>
                                  <span className="text-xl font-bold">{formatPrice(plan.retouchPrice6m)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* モニター価格（有効な場合のみ） */}
                        {plan.monitorEnabled && plan.monitorPrice != null && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 md:col-span-2">
                            <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                              📷 モニター価格
                            </h3>
                            <div className="flex justify-between items-baseline">
                              <span className="text-gray-700">モニター料金</span>
                              <span className="text-2xl font-bold text-amber-700">
                                {formatPrice(plan.monitorPrice)}
                              </span>
                            </div>
                            <p className="text-xs text-amber-600 mt-2">
                              ※ 施術前後の写真撮影・SNS掲載にご協力いただける方が対象です
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 予約ボタン */}
                      <div className="mt-8 text-center">
                        <Link href="/reservation">
                          <MobileButton variant="primary" fullWidth className="max-w-xs mx-auto">
                            このメニューで予約する
                          </MobileButton>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-primary to-dark-gold text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">まずは無料カウンセリングから</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              お客様のご希望をじっくりお伺いし、最適なメニューをご提案いたします。
              カウンセリングのみのご来店も歓迎です。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/reservation">
                <MobileButton variant="secondary" size="large">
                  カウンセリング予約
                </MobileButton>
              </Link>
              <a href="https://line.me/R/ti/p/@174geemy" target="_blank" rel="noopener noreferrer">
                <MobileButton
                  variant="primary"
                  size="large"
                  className="bg-green-600 hover:bg-green-700"
                >
                  LINEで相談する
                </MobileButton>
              </a>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
