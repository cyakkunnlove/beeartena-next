import Image from 'next/image'
import Link from 'next/link'

interface FooterProps {
  className?: string
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-gray-900 text-white ${className}`}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">BEE ART ENA</h3>
            <p className="mb-4">理容師による安心のタトゥーメイクサロン</p>
            <div className="space-y-2 text-sm">
              <p>〒509-7203 岐阜県恵那市長島町正家1丁目1-25 カットハウス恵那</p>
              <p>TEL: 090-5278-5221</p>
              <p>Email: info@beeartena.jp</p>
              <p>🚗 駐車場あり | 🚭 禁煙 | 🔌 コンセントあり | 🏠 個室あり</p>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-4">クイックリンク</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  メニュー・料金
                </Link>
              </li>
              <li>
                <Link href="/reservation" className="hover:text-primary transition-colors">
                  予約
                </Link>
              </li>
              <li>
                <Link href="/aftercare" className="hover:text-primary transition-colors">
                  アフターケア
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4 mb-4">
              <div className="text-center">
                <Image
                  src="/images/instaqr.jpg"
                  alt="Instagram QRコード"
                  width={120}
                  height={120}
                  className="rounded-lg"
                />
                <p className="text-sm mt-2">Instagram</p>
              </div>
              <div className="text-center">
                <Image
                  src="/images/lineqr.png"
                  alt="LINE QRコード"
                  width={120}
                  height={120}
                  className="rounded-lg"
                />
                <p className="text-sm mt-2">LINE公式</p>
              </div>
            </div>
            <div className="space-y-2">
              <a
                href="https://instagram.com/beeartena"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:text-primary transition-colors"
              >
                Instagram
              </a>
              <br />
              <a
                href="https://line.me/R/ti/p/@174geemy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:text-primary transition-colors"
              >
                LINE公式アカウント
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p>&copy; 2024 BEE ART ENA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
