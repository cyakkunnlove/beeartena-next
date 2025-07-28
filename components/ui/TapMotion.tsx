'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface TapMotionProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function TapMotion({ children, className, onClick }: TapMotionProps) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      {children}
    </motion.div>
  )
}
