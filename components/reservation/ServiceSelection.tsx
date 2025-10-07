'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import type { ServicePlan } from '@/lib/types'

interface ServiceSelectionProps {
  services: ServicePlan[]
  onSelect: (serviceId: string) => void
  selected: string
}

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

const formatDuration = (minutes?: number) => {
  if (!minutes || minutes <= 0) return '所要時間: 約60分'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours && mins) return `所要時間: 約${hours}時間${mins}分`
  if (hours) return `所要時間: 約${hours}時間`
  return `所要時間: 約${mins}分`
}

const formatYen = (value: number) => `¥${value.toLocaleString()}`

export default function ServiceSelection({ services, onSelect, selected }: ServiceSelectionProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(selected)

  useEffect(() => {
    setSelectedServiceId(selected)
  }, [selected])

  const sortedServices = useMemo(() => {
    return services
      .filter((service) => service.isPublished !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }, [services])

  const selectedPlan = useMemo(
    () => sortedServices.find((plan) => plan.id === selectedServiceId),
    [sortedServices, selectedServiceId],
  )

  const handleServiceClick = (plan: ServicePlan) => {
    setSelectedServiceId(plan.id)
    onSelect(plan.id)
  }

  if (sortedServices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
        現在選択できるプランがありません。管理画面からサービスプランを追加してください。
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedServices.map((service, index) => {
          const isFeatured = Boolean(service.isFeatured)
          const showCustomBadge = Boolean(
            service.badge && (!isFeatured || service.badge !== '人気No.1'),
          )

          return (
            <motion.button
              key={service.id}
              type="button"
              onClick={() => handleServiceClick(service)}
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-6 rounded-xl border-2 transition-all touch-manipulation ${
                selectedServiceId === service.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              {isFeatured && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
                  className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg"
                >
                  人気No.1
                </motion.div>
              )}
              {showCustomBadge && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
                  className={`absolute top-0 right-0 ${isFeatured ? 'mt-6' : ''} bg-amber-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg`}
                >
                  {service.badge}
                </motion.div>
              )}

              <motion.div
                className="text-3xl font-bold text-primary mb-2 uppercase"
                animate={selectedServiceId === service.id ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {service.type}
              </motion.div>
              <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
              <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">
                {service.description}
              </p>
              <div className="mb-1 space-y-1">
                {service.otherShopPrice && (
                  <p className="text-sm text-gray-400 line-through decoration-red-500 decoration-2">
                    他店価格: {formatYen(service.otherShopPrice)}
                  </p>
                )}
                <p className="text-xl font-bold">当店価格: {formatYen(service.price)}</p>
                {service.monitorPrice && (
                  <p className="text-lg font-bold text-primary">
                    モニター価格: {formatYen(service.monitorPrice)}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">{formatDuration(service.duration)}</p>

              {selectedServiceId === service.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
                />
              )}
            </motion.button>
          )
        })}
      </motion.div>

      {selectedPlan?.monitorPrice && (
        <div className="rounded-xl bg-gray-50 p-6 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">モニター価格のご案内</p>
          <p className="mt-2">
            モニター価格 ({formatYen(selectedPlan.monitorPrice)}) の適用可否は予約情報入力ステップで選択できます。
            条件をご確認のうえご選択ください。
          </p>
        </div>
      )}
    </div>
  )
}
