'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getServicePlans } from '@/lib/firebase/servicePlans'
import type { ServicePlan } from '@/lib/types'

const formatPrice = (price: number) => `¥${price.toLocaleString()}`

export default function MenuSection() {
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

  if (loading) {
    return (
      <section id="menu" className="py-20 bg-light-accent">
        <div className="container mx-auto px-4">
          <h2 className="section-title">メニュー & 料金</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-md animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="menu" className="py-20 bg-light-accent">
      <div className="container mx-auto px-4">
        <h2 className="section-title">メニュー & 料金</h2>
        <p className="section-subtitle">✨ ART MAKE PRICE LIST ✨</p>

        <div className={`grid grid-cols-1 gap-8 ${plans.length >= 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'max-w-lg mx-auto'}`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow ${
                plan.isFeatured ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl font-semibold text-sm">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

              {plan.image && (
                <div className="mb-4 h-48 relative overflow-hidden rounded-lg">
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 90vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                {/* 通常価格 */}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-500">通常価格</span>
                  <span className="text-2xl font-bold">{formatPrice(plan.price)}</span>
                </div>

                {/* キャンペーン価格 */}
                {plan.campaignPrice != null && (
                  <div className="bg-pink-50 rounded-lg p-3 space-y-1">
                    <div className="text-xs font-semibold text-pink-600">🎉 キャンペーン</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-gray-600">1回目</span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-pink-600">{formatPrice(plan.campaignPrice)}</span>
                        {plan.campaignReferralDiscount != null && plan.campaignReferralDiscount > 0 && (
                          <div className="text-xs text-pink-500">
                            紹介割引 さらに −{formatPrice(plan.campaignReferralDiscount)}
                          </div>
                        )}
                      </div>
                    </div>
                    {plan.secondPrice != null && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-gray-600">2回目</span>
                        <span className="text-lg font-bold text-pink-600">{formatPrice(plan.secondPrice)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* リタッチ */}
                {(plan.retouchPrice3m != null || plan.retouchPrice6m != null) && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="text-xs font-semibold text-gray-500">🔄 リタッチ</div>
                    {plan.retouchPrice3m != null && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-gray-600">3ヶ月以内</span>
                        <span className="text-base font-semibold">{formatPrice(plan.retouchPrice3m)}</span>
                      </div>
                    )}
                    {plan.retouchPrice6m != null && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-gray-600">6ヶ月以内</span>
                        <span className="text-base font-semibold">{formatPrice(plan.retouchPrice6m)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* モニター価格 */}
                {plan.monitorEnabled && plan.monitorPrice != null && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-amber-700">📷 モニター価格</span>
                      <span className="text-xl font-bold text-amber-700">{formatPrice(plan.monitorPrice)}</span>
                    </div>
                  </div>
                )}

                {/* 所要時間 */}
                <p className="text-sm text-gray-500 pt-1">
                  ⏱ 所要時間：{plan.durationText ?? `${plan.duration}分`}
                </p>

                {/* 補足 */}
                {plan.note && (
                  <p className="text-xs text-gray-400">{plan.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/reservation" className="btn btn-primary btn-large">
            予約する
          </Link>
        </div>
      </div>
    </section>
  )
}
