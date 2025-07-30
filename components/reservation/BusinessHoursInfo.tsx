'use client'

import { motion } from 'framer-motion'

import { reservationService } from '@/lib/reservationService'

export default function BusinessHoursInfo() {
  const settings = reservationService.getSettings()
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hour, minute] = time.split(':')
    return `${hour}:${minute}`
  }

  const groupedHours = () => {
    const groups: { days: string[]; hours: string; maxCapacity?: number; hasMultipleSlots?: boolean }[] = []

    settings.businessHours.forEach((hours, index) => {
      if (!hours.isOpen) return

      const hoursStr = `${formatTime(hours.open)}〜${formatTime(hours.close)}`
      const maxCapacity = hours.maxCapacityPerDay || 1
      const hasMultipleSlots = hours.allowMultipleSlots || false
      
      const existingGroup = groups.find((g) => 
        g.hours === hoursStr && 
        g.maxCapacity === maxCapacity && 
        g.hasMultipleSlots === hasMultipleSlots
      )

      if (existingGroup) {
        existingGroup.days.push(daysOfWeek[index])
      } else {
        groups.push({
          days: [daysOfWeek[index]],
          hours: hoursStr,
          maxCapacity,
          hasMultipleSlots,
        })
      }
    })

    return groups
  }

  const groups = groupedHours()

  return (
    <motion.div
      className="bg-light-accent rounded-lg p-4 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="font-semibold text-gray-700 mb-2">営業時間</h3>
      <div className="space-y-1 text-sm text-gray-600">
        {groups.map((group, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <span className="font-medium">{group.days.join('・')}曜日:</span>
            <span className="ml-2">{group.hours}</span>
            {group.hasMultipleSlots && (
              <span className="ml-2 text-xs text-primary">
                (複数予約可)
              </span>
            )}
          </motion.div>
        ))}
        {settings.businessHours.filter((h) => !h.isOpen).length > 0 && (
          <motion.div
            className="text-red-500"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groups.length * 0.1 }}
          >
            <span className="font-medium">休業日:</span>
            <span className="ml-2">
              {settings.businessHours
                .map((h, i) => (!h.isOpen ? daysOfWeek[i] : null))
                .filter(Boolean)
                .join('・')}
              曜日
            </span>
          </motion.div>
        )}
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {(() => {
          // 全ての営業日が1日1名限定かチェック
          const allDaysLimited = settings.businessHours
            .filter(h => h.isOpen)
            .every(h => (h.maxCapacityPerDay || 1) === 1 && !h.allowMultipleSlots)
          
          // 一部の曜日が複数予約可能かチェック
          const someDaysMultiple = settings.businessHours
            .filter(h => h.isOpen)
            .some(h => (h.maxCapacityPerDay || 1) > 1 || h.allowMultipleSlots)
          
          if (allDaysLimited) {
            return '※ 1日1名限定の完全予約制となっております'
          } else if (someDaysMultiple) {
            // 複数予約可能な曜日を取得
            const multipleDays = settings.businessHours
              .filter(h => h.isOpen && ((h.maxCapacityPerDay || 1) > 1 || h.allowMultipleSlots))
              .map(h => daysOfWeek[h.dayOfWeek])
              .join('・')
            
            return `※ 完全予約制（${multipleDays}曜日は複数予約可）`
          } else {
            return '※ 完全予約制となっております'
          }
        })()}
      </div>
    </motion.div>
  )
}
