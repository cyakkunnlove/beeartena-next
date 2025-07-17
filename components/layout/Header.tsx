'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/aicon.jpg"
              alt="BEE ART ENA"
              width={150}
              height={60}
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center gap-6">
            <li><Link href="/" className="text-gray-700 hover:text-primary transition-colors">トップ</Link></li>
            <li><Link href="/pricing" className="text-gray-700 hover:text-primary transition-colors">メニュー・料金</Link></li>
            <li><Link href="/#plan" className="text-gray-700 hover:text-primary transition-colors">安心プラン</Link></li>
            <li><Link href="/#care" className="text-gray-700 hover:text-primary transition-colors">アフターケア</Link></li>
            <li><Link href="/#profile" className="text-gray-700 hover:text-primary transition-colors">プロフィール</Link></li>
            <li><Link href="/#gallery" className="text-gray-700 hover:text-primary transition-colors">症例ギャラリー</Link></li>
            <li><Link href="/#faq" className="text-gray-700 hover:text-primary transition-colors">FAQ</Link></li>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <li><Link href="/admin" className="text-gray-700 hover:text-primary transition-colors">管理画面</Link></li>
                ) : (
                  <li><Link href="/mypage" className="text-gray-700 hover:text-primary transition-colors">マイページ</Link></li>
                )}
                <li>
                  <button onClick={handleLogout} className="text-gray-700 hover:text-primary transition-colors">
                    ログアウト
                  </button>
                </li>
              </>
            ) : (
              <li><Link href="/login" className="text-gray-700 hover:text-primary transition-colors">会員登録/ログイン</Link></li>
            )}
            <li><Link href="/reservation" className="btn btn-primary">予約する</Link></li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden relative w-8 h-8"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニューを開く"
          >
            <span className={`absolute left-0 w-full h-0.5 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'top-4 rotate-45' : 'top-2'}`}></span>
            <span className={`absolute left-0 w-full h-0.5 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'top-4'}`}></span>
            <span className={`absolute left-0 w-full h-0.5 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'top-4 -rotate-45' : 'top-6'}`}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} mt-4 pb-4`}>
          <ul className="flex flex-col gap-4">
            <li><Link href="/" className="block text-gray-700 hover:text-primary transition-colors">トップ</Link></li>
            <li><Link href="/pricing" className="block text-gray-700 hover:text-primary transition-colors">メニュー・料金</Link></li>
            <li><Link href="/#plan" className="block text-gray-700 hover:text-primary transition-colors">安心プラン</Link></li>
            <li><Link href="/#care" className="block text-gray-700 hover:text-primary transition-colors">アフターケア</Link></li>
            <li><Link href="/#profile" className="block text-gray-700 hover:text-primary transition-colors">プロフィール</Link></li>
            <li><Link href="/#gallery" className="block text-gray-700 hover:text-primary transition-colors">症例ギャラリー</Link></li>
            <li><Link href="/#faq" className="block text-gray-700 hover:text-primary transition-colors">FAQ</Link></li>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <li><Link href="/admin" className="block text-gray-700 hover:text-primary transition-colors">管理画面</Link></li>
                ) : (
                  <li><Link href="/mypage" className="block text-gray-700 hover:text-primary transition-colors">マイページ</Link></li>
                )}
                <li>
                  <button onClick={handleLogout} className="block w-full text-left text-gray-700 hover:text-primary transition-colors">
                    ログアウト
                  </button>
                </li>
              </>
            ) : (
              <li><Link href="/login" className="block text-gray-700 hover:text-primary transition-colors">会員登録/ログイン</Link></li>
            )}
            <li><Link href="/reservation" className="btn btn-primary block text-center">予約する</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}