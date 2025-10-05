'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 300,
    scale: 0.95,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: -300,
    scale: 0.95,
  },
}

const pageTransition = {
  type: 'spring' as const,
  damping: 22,
  stiffness: 120,
  mass: 0.8,
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  const isAdminPage = pathname?.startsWith('/admin')

  if (isAdminPage) {
    return <div style={{ width: '100%' }}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
