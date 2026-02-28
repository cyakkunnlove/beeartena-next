'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      // Still redirect even if logout fails
      router.push('/')
    }
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.jpg"
              alt="beeartena"
              width={150}
              height={60}
              className="h-12 w-auto rounded"
            />
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center gap-6">
            <li>
              <Link href="/" className="text-gray-700 hover:text-primary transition-colors">
                トップ
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-gray-700 hover:text-primary transition-colors">
                メニュー・料金
              </Link>
            </li>
            <li>
              <Link href="/maintenance" className="text-gray-700 hover:text-primary transition-colors">
                メンテナンス
              </Link>
            </li>
            <li>
              <Link href="/#plan" className="text-gray-700 hover:text-primary transition-colors">
                安心プラン
              </Link>
            </li>
            <li>
              <Link href="/#care" className="text-gray-700 hover:text-primary transition-colors">
                アフターケア
              </Link>
            </li>
            <li>
              <Link href="/#profile" className="text-gray-700 hover:text-primary transition-colors">
                プロフィール
              </Link>
            </li>
            <li>
              <Link href="/#gallery" className="text-gray-700 hover:text-primary transition-colors">
                症例ギャラリー
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="text-gray-700 hover:text-primary transition-colors">
                FAQ
              </Link>
            </li>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <li>
                    <Link
                      href="/admin"
                      className="text-gray-700 hover:text-primary transition-colors"
                    >
                      管理画面
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link
                      href="/mypage"
                      className="text-gray-700 hover:text-primary transition-colors"
                    >
                      マイページ
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-primary transition-colors"
                  >
                    ログアウト
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link href="/login" className="text-gray-700 hover:text-primary transition-colors">
                  会員登録/ログイン
                </Link>
              </li>
            )}
            <li>
              <Link href="/reservation" className="btn btn-primary">
                予約する
              </Link>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden relative w-8 h-8"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニューを開く"
            whileTap={{ scale: 0.9 }}
          >
            <motion.span
              className="absolute left-0 w-full h-0.5 bg-gray-800"
              animate={isMenuOpen ? { top: '16px', rotate: 45 } : { top: '8px', rotate: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="absolute left-0 w-full h-0.5 bg-gray-800"
              animate={{ opacity: isMenuOpen ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              style={{ top: '16px' }}
            />
            <motion.span
              className="absolute left-0 w-full h-0.5 bg-gray-800"
              animate={isMenuOpen ? { top: '16px', rotate: -45 } : { top: '24px', rotate: 0 }}
              transition={{ duration: 0.2 }}
            />
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden mt-4 pb-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <motion.ul className="flex flex-col gap-4">
                {[
                  { href: '/', label: 'トップ' },
                  { href: '/pricing', label: 'メニュー・料金' },
                  { href: '/maintenance', label: 'メンテナンス' },
                  { href: '/#plan', label: '安心プラン' },
                  { href: '/#care', label: 'アフターケア' },
                  { href: '/#profile', label: 'プロフィール' },
                  { href: '/#gallery', label: '症例ギャラリー' },
                  { href: '/#faq', label: 'FAQ' },
                ].map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className="block text-gray-700 hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
                {user ? (
                  <>
                    <motion.li
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      {user.role === 'admin' ? (
                        <Link
                          href="/admin"
                          className="block text-gray-700 hover:text-primary transition-colors"
                        >
                          管理画面
                        </Link>
                      ) : (
                        <Link
                          href="/mypage"
                          className="block text-gray-700 hover:text-primary transition-colors"
                        >
                          マイページ
                        </Link>
                      )}
                    </motion.li>
                    <motion.li
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left text-gray-700 hover:text-primary transition-colors"
                      >
                        ログアウト
                      </button>
                    </motion.li>
                  </>
                ) : (
                  <motion.li
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                  >
                    <Link
                      href="/login"
                      className="block text-gray-700 hover:text-primary transition-colors"
                    >
                      会員登録/ログイン
                    </Link>
                  </motion.li>
                )}
                <motion.li
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <Link href="/reservation" className="btn btn-primary block text-center">
                    予約する
                  </Link>
                </motion.li>
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
