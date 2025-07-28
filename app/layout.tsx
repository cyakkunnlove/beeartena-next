import type { Metadata, Viewport } from 'next'
import './globals.css'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { AuthProvider } from '@/lib/auth/AuthContext'
import PageTransition from '@/components/layout/PageTransition'
import StructuredData from '@/components/seo/StructuredData'
import SkipLink from '@/components/a11y/SkipLink'

export const metadata: Metadata = {
  metadataBase: new URL('https://beeartena.vercel.app'),
  title: 'BEE ART ENA - 理容師による安心のタトゥーメイクサロン',
  description:
    '理容師が行う1日1名限定のプレミアムタトゥーメイク。半年以内リタッチ11,000円の安心プラン。眉・頭皮の悩みを解決します。',
  keywords: 'タトゥーメイク,眉,アートメイク,恵那,岐阜,理容師,BEE ART ENA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BEE ART ENA',
  },
  openGraph: {
    title: 'BEE ART ENA - 理容師による安心のタトゥーメイクサロン',
    description: '理容師が行う1日1名限定のプレミアムタトゥーメイク',
    images: ['/images/topimageafter.png'],
    url: 'https://beeartena.vercel.app',
    siteName: 'BEE ART ENA',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEE ART ENA - 理容師による安心のタトゥーメイクサロン',
    description: '理容師が行う1日1名限定のプレミアムタトゥーメイク',
    images: ['/images/topimageafter.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <StructuredData />
      </head>
      <body className="min-h-screen flex flex-col">
        <SkipLink />
        <AuthProvider>
          <LayoutWrapper>
            <PageTransition>{children}</PageTransition>
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
