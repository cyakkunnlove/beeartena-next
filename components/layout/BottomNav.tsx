'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/lib/auth/AuthContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { href: '/', icon: '🏠', label: 'ホーム' },
    { href: '/reservation', icon: '📅', label: '予約' },
    { href: '/pricing', icon: '💰', label: '料金' },
    user
      ? { href: '/mypage', icon: '👤', label: 'マイページ' }
      : { href: '/login', icon: '👤', label: 'ログイン' },
  ]

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe md:hidden z-40"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <motion.div
                className={`flex flex-col items-center justify-center ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute -top-0.5 w-12 h-1 bg-primary rounded-full"
                    layoutId="bottomNavIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}
