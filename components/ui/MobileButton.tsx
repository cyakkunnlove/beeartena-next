'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MobileButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export default function MobileButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
}: MobileButtonProps) {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 touch-manipulation'

  const sizeClasses = {
    small: 'px-4 py-2 text-sm min-h-[40px]',
    medium: 'px-6 py-3 text-base min-h-[48px]',
    large: 'px-8 py-4 text-lg min-h-[56px]',
  }

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-dark-gold active:bg-dark-gold',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-300',
    outline:
      'border-2 border-primary text-primary hover:bg-primary hover:text-white active:bg-primary active:text-white',
  }

  const widthClass = fullWidth ? 'w-full' : ''
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${disabledClass} ${className}`}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  )
}
