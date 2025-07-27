'use client';

import { usePathname } from 'next/navigation';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  // 管理画面の場合はヘッダー、フッター、ボトムナビを表示しない
  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="main-content" className="flex-grow pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <BottomNav />
    </>
  );
}