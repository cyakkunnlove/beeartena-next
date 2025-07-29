'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function MaintenancePage() {
  const maintenanceServices = [
    {
      id: 'cut-shave',
      name: '眉カット＋フェイスシェービング',
      description: 'プロの技で眉の形を整え、お顔のうぶ毛もケアしてメイクのりUP！',
      price: 2000,
      icon: '✂️',
    },
    {
      id: 'nose-wax',
      name: '鼻毛ワックス脱毛',
      description: '気になる鼻毛もワックスですっきり！清潔感がぐんとアップします。',
      price: 500,
      icon: '👃',
    },
    {
      id: 'bleach',
      name: '眉毛ブリーチ（脱色）',
      description: '眉毛の色をふんわり明るく♪ 垢抜け感がプラスされます。',
      price: 1000,
      icon: '✨',
    },
  ]

  const fullSetPrice = 3000
  const regularTotal = maintenanceServices.reduce((sum, service) => sum + service.price, 0)
  const savings = regularTotal - fullSetPrice

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              ✨ メンテナンスメニュー ✨
            </h1>
            <p className="text-lg text-gray-600">
              BeeArtEnaをご利用いただいたお客様限定
            </p>
            <p className="text-sm text-gray-500 mt-2">
              キレイをキープするためのお得なメンテナンスメニューです
            </p>
          </div>

          {/* 個別メニュー */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {maintenanceServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4 text-center">{service.icon}</div>
                <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                <p className="text-2xl font-bold text-primary">
                  ¥{service.price.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>

          {/* フルセットプラン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 shadow-lg"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">
                👑 全部おまかせ！お得なフルセット 👑
              </h2>
              <p className="text-gray-600 mb-6">
                上記3メニュー全部セットで
              </p>
              <div className="mb-6">
                <p className="text-sm text-gray-500 line-through">
                  通常合計 ¥{regularTotal.toLocaleString()}
                </p>
                <p className="text-4xl font-bold text-primary">
                  特別価格 ¥{fullSetPrice.toLocaleString()}
                </p>
                <p className="text-lg text-green-600 font-bold mt-2">
                  {savings}円お得！🉐
                </p>
              </div>
            </div>
          </motion.div>

          {/* 注意事項 */}
          <div className="mt-12 bg-white rounded-lg p-6 shadow-md">
            <h3 className="font-bold text-lg mb-4">ご利用について</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>当スタジオで施術を受けられたことのあるお客様限定のメニューです</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>メンテナンスメニューのみのご予約も承っております</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>施術時間は全メニュー合わせて約30分程度です</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link href="/reservation">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary text-lg px-8 py-4"
              >
                メンテナンス予約はこちら
              </motion.button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              ご不明な点はお気軽にお問い合わせください
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}