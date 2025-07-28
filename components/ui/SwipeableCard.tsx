'use client'

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { ReactNode, useState } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const [isDragging, setIsDragging] = useState(false)

  const background = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(239, 68, 68, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(34, 197, 94, 0.2)'],
  )

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false)
    const threshold = 100

    if (info.offset.x > threshold && onSwipeRight) {
      controls.start({ x: 300, opacity: 0 })
      setTimeout(onSwipeRight, 300)
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      controls.start({ x: -300, opacity: 0 })
      setTimeout(onSwipeLeft, 300)
    } else {
      controls.start({ x: 0 })
    }
  }

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ x, background }}
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      animate={controls}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>{children}</div>

      {/* Visual indicators */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 -left-8 text-red-500"
        style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
      >
        ❌
      </motion.div>
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 -right-8 text-green-500"
        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
      >
        ✅
      </motion.div>
    </motion.div>
  )
}
