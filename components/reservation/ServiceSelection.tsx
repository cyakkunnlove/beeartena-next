'use client'

import { motion } from 'framer-motion'

interface ServiceSelectionProps {
  onSelect: (service: string) => void
  selected: string
}

const services = [
  {
    id: '2D',
    name: '2D パウダーブロウ',
    description: 'まるでパウダーで描いたような、ふんわり優しい印象に',
    price: 22000,
    duration: '約2時間',
    monitorPrice: 20000,
  },
  {
    id: '3D',
    name: '3D フェザーブロウ',
    description: '一本一本丁寧に毛流れを描き、自眉のような自然で立体的な印象に',
    price: 23000,
    duration: '約2時間',
    monitorPrice: 20000,
  },
  {
    id: '4D',
    name: '4D パウダー＆フェザー',
    description: 'パウダーのふんわり感と、フェザーの立体感を組み合わせた、最も自然で洗練された印象に',
    price: 25000,
    duration: '約2時間',
    featured: true,
    monitorPrice: 22000,
  },
  {
    id: 'wax',
    name: '眉毛ワックス脱毛',
    description: 'すっきり整った眉毛に',
    price: 15000,
    duration: '約30分',
  },
  {
    id: 'retouch',
    name: '安心プラン（リタッチ）',
    description: '2回の施術完了から半年以内の方限定。少し薄くなってきた・形を微調整したい方に',
    price: 11000,
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

export default function ServiceSelection({ onSelect, selected }: ServiceSelectionProps) {
  return (
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
          onClick={() => onSelect(service.id)}
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`relative p-6 rounded-xl border-2 transition-all touch-manipulation ${
            selected === service.id
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
            animate={selected === service.id ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {service.id}
          </motion.div>
          <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{service.description}</p>
          <div className="mb-1">
            <p className="text-2xl font-bold">¥{service.price.toLocaleString()}</p>
            {service.monitorPrice && (
              <p className="text-sm text-primary mt-1">
                モニター価格: ¥{service.monitorPrice.toLocaleString()}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">{service.duration}</p>

          {selected === service.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
            />
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}
