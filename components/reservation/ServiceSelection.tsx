'use client'

import { motion } from 'framer-motion'
import React from 'react'

interface ServiceSelectionProps {
  onSelect: (service: string, isMonitor?: boolean) => void
  selected: string
  isMonitorPrice?: boolean
}

const services: Array<{
  id: string
  name: string
  description: string
  price: number
  duration: string
  monitorPrice?: number
  otherShopPrice?: number
  featured?: boolean
  requiresHistory?: boolean
  badge?: string
}> = [
  {
    id: '2D',
    name: '2D パウダーブロウ',
    description: 'まるでパウダーで描いたような、ふんわり優しい印象に',
    price: 22000,
    duration: '約2時間30分',
    monitorPrice: 20000,
    otherShopPrice: 35000,
  },
  {
    id: '3D',
    name: '3D フェザーブロウ',
    description: '一本一本丁寧に毛流れを描き、自眉のような自然で立体的な印象に',
    price: 23000,
    duration: '約2時間30分',
    monitorPrice: 20000,
    otherShopPrice: 35000,
  },
  {
    id: '4D',
    name: '4D パウダー＆フェザー',
    description: 'パウダーのふんわり感と、フェザーの立体感を組み合わせた、最も自然で洗練された印象に',
    price: 25000,
    duration: '約2時間30分',
    featured: true,
    monitorPrice: 22000,
    otherShopPrice: 40000,
  },
  {
    id: 'wax',
    name: '眉毛ワックス脱毛',
    description: 'すっきり整った眉毛に',
    price: 15000,
    duration: '約30分',
  },
  {
    id: 'retouch3',
    name: '3ヶ月以内リタッチ',
    description: '初回施術から2回目完了後、3ヶ月以内の方限定。色の定着を確実にしたい方に',
    price: 11000,
    duration: '約1時間30分',
    requiresHistory: true,
    badge: '人気プラン',
  },
  {
    id: 'retouch6',
    name: '半年以内リタッチ',
    description: '3ヶ月を過ぎて半年以内の方限定。少し薄くなってきた・形を微調整したい方に',
    price: 15000,
    duration: '約1時間30分',
    requiresHistory: true,
    badge: 'リピーター限定',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12,
    },
  },
}

export default function ServiceSelection({ onSelect, selected, isMonitorPrice }: ServiceSelectionProps) {
  const [selectedService, setSelectedService] = React.useState(selected)
  const [isMonitor, setIsMonitor] = React.useState(isMonitorPrice || false)

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    const service = services.find(s => s.id === serviceId)
    
    // モニター価格がないサービスの場合は通常価格で進む
    if (!service?.monitorPrice) {
      onSelect(serviceId, false)
    } else {
      // モニター価格がある場合は選択画面を表示
      setSelectedService(serviceId)
    }
  }

  const handlePriceConfirm = () => {
    if (selectedService) {
      onSelect(selectedService, isMonitor)
    }
  }

  return (
    <>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {services.map((service, index) => (
          <motion.button
            key={service.id}
            type="button"
            onClick={() => handleServiceSelect(service.id)}
            variants={itemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          className={`relative p-6 rounded-xl border-2 transition-all touch-manipulation ${
            selectedService === service.id
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          {service.featured && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
              className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg"
            >
              人気No.1
            </motion.div>
          )}
          {service.badge && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
              className="absolute top-0 right-0 bg-amber-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg"
            >
              {service.badge}
            </motion.div>
          )}

          <motion.div
            className="text-3xl font-bold text-primary mb-2"
            animate={selectedService === service.id ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {service.id}
          </motion.div>
          <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{service.description}</p>
          <div className="mb-1">
            {service.monitorPrice && (
              <>
                <p className="text-sm text-gray-400 line-through decoration-red-500 decoration-2">
                  他店価格: ¥{service.otherShopPrice?.toLocaleString()}
                </p>
                <p className="text-xl font-bold">
                  通常価格: ¥{service.price.toLocaleString()}
                </p>
                <p className="text-lg font-bold text-primary">
                  モニター価格: ¥{service.monitorPrice.toLocaleString()}
                </p>
              </>
            )}
            {!service.monitorPrice && (
              <p className="text-2xl font-bold">¥{service.price.toLocaleString()}</p>
            )}
          </div>
          <p className="text-xs text-gray-500">{service.duration}</p>

          {selectedService === service.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
            />
          )}
        </motion.button>
      ))}
    </motion.div>

    {/* モニター価格選択モーダル */}
    {selectedService && services.find(s => s.id === selectedService)?.monitorPrice && (
      <div className="mt-6 p-6 bg-gray-50 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">価格プランを選択してください</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setIsMonitor(false)}
            className={`p-4 rounded-lg border-2 transition-all ${
              !isMonitor ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
          >
            <p className="font-semibold mb-2">通常価格</p>
            <p className="text-2xl font-bold">
              ¥{services.find(s => s.id === selectedService)?.price.toLocaleString()}
            </p>
          </button>
          
          <button
            onClick={() => setIsMonitor(true)}
            className={`p-4 rounded-lg border-2 transition-all ${
              isMonitor ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
          >
            <p className="font-semibold mb-2">モニター価格</p>
            <p className="text-2xl font-bold text-primary">
              ¥{services.find(s => s.id === selectedService)?.monitorPrice?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              ※写真撮影にご協力いただきます
            </p>
          </button>
        </div>
        
        <button
          onClick={handlePriceConfirm}
          className="mt-4 w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          次へ進む
        </button>
      </div>
    )}
    </>
  )
}
