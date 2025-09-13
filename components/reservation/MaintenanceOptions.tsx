'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface MaintenanceOption {
  id: string
  name: string
  price: number
  description?: string
}

interface MaintenanceOptionsProps {
  onNext: (selectedOptions: string[], totalPrice: number) => void
  baseServicePrice: number
  isMonitorPrice?: boolean
}

const maintenanceOptions: MaintenanceOption[] = [
  {
    id: 'cut-shave',
    name: '眉カット＋フェイスシェービング',
    price: 2000,
    description: '眉毛を整えて、お顔の産毛もきれいに',
  },
  {
    id: 'nose-wax',
    name: '鼻毛ワックス脱毛',
    price: 500,
    description: '気になる鼻毛をすっきりと',
  },
  {
    id: 'bleach',
    name: '眉毛ブリーチ（脱色）',
    price: 1000,
    description: '眉毛を明るくして優しい印象に',
  },
]

const FULL_SET_PRICE = 3000 // セット価格（通常3,500円→3,000円）

export default function MaintenanceOptions({ onNext, baseServicePrice, isMonitorPrice }: MaintenanceOptionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [useFullSet, setUseFullSet] = useState(false)

  const toggleOption = (optionId: string) => {
    if (useFullSet) return // セット選択時は個別選択不可

    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId)
      } else {
        return [...prev, optionId]
      }
    })
  }

  const toggleFullSet = () => {
    setUseFullSet(!useFullSet)
    // フルセット選択時は個別選択をクリア
    setSelectedOptions([])
  }

  const calculateMaintenancePrice = () => {
    if (useFullSet) return FULL_SET_PRICE
    
    return selectedOptions.reduce((total, optionId) => {
      const option = maintenanceOptions.find(opt => opt.id === optionId)
      return total + (option?.price || 0)
    }, 0)
  }

  const maintenancePrice = calculateMaintenancePrice()
  const totalPrice = baseServicePrice + maintenancePrice

  const handleNext = () => {
    onNext(selectedOptions, totalPrice)
  }

  const handleSkip = () => {
    onNext([], baseServicePrice)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">メンテナンスメニューを追加しますか？</h3>
        <p className="text-sm text-gray-600">
          アートメイクと一緒に、眉毛のお手入れもいかがですか？
        </p>
      </div>

      {/* フルセットオプション */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <button
          type="button"
          onClick={toggleFullSet}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            useFullSet
              ? 'border-primary bg-primary/10'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h4 className="font-semibold">フルセット（全メニュー）</h4>
              <p className="text-sm text-gray-600 mt-1">
                眉カット＋シェービング＋鼻毛脱毛＋眉毛ブリーチ
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">¥{FULL_SET_PRICE.toLocaleString()}</p>
              <p className="text-xs text-gray-500 line-through">通常 ¥3,500</p>
              <p className="text-xs text-green-600 font-semibold">¥500お得！</p>
            </div>
          </div>
        </button>
      </motion.div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">または個別に選択</span>
        </div>
      </div>

      {/* 個別オプション */}
      <div className="space-y-3">
        {maintenanceOptions.map((option, index) => (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => toggleOption(option.id)}
            disabled={useFullSet}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedOptions.includes(option.id)
                ? 'border-primary bg-primary/5'
                : useFullSet
                ? 'border-gray-200 bg-gray-50 opacity-50'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{option.name}</h4>
                {option.description && (
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                )}
              </div>
              <p className="text-lg font-bold">¥{option.price.toLocaleString()}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 合計金額表示 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>メインメニュー</span>
            <span>¥{baseServicePrice.toLocaleString()}</span>
          </div>
          {maintenancePrice > 0 && (
            <div className="flex justify-between text-sm">
              <span>メンテナンスメニュー</span>
              <span>¥{maintenancePrice.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>合計</span>
            <span className="text-primary">¥{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSkip}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          次へ
        </button>
      </div>

      {/* メンテナンスのみの案内 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          ※ メンテナンスメニューのみのご予約は、
          <a
            href="https://line.me/R/ti/p/@174geemy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-blue-900"
          >
            LINE
          </a>
          にてお問い合わせください。
        </p>
      </div>
    </div>
  )
}