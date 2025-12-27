// eslint-disable-next-line import/order
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'

import SkipLink from '@/components/a11y/SkipLink'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import PageTransition from '@/components/layout/PageTransition'
import StructuredData from '@/components/seo/StructuredData'
import { AuthProvider } from '@/lib/auth/AuthContext'

import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beeartena.com'
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const disableServiceWorkerScript = `(() => {
  if (typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    const unregisterAll = () =>
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) =>
              registration
                .unregister()
                .catch(() => undefined),
            ),
          ),
        )
        .catch(() => undefined);

    unregisterAll();

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister().catch(() => undefined);
      })
      .catch(() => undefined);
  }

  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('beeartena-') ||
                key.startsWith('workbox-precache') ||
                key === 'form-submissions',
            )
            .map((key) => caches.delete(key).catch(() => undefined)),
        ),
      )
      .catch(() => undefined);
  }
})();`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BEE ART ENA - 理容師による安心のタトゥーメイクサロン',
  description:
    '理容師が行う1日1名限定のプレミアムタトゥーメイク。半年以内リタッチ15,000円の安心プラン。眉・頭皮の悩みを解決します。',
  keywords: 'タトゥーメイク,眉,美容,恵那,岐阜,理容師,BEE ART ENA',
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
    url: siteUrl,
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
  robots: isDemoMode
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : {
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
    <html lang="ja" data-scroll-behavior="smooth">
      <head>
        <StructuredData />
        {process.env.NODE_ENV !== 'production' && (
          <Script id="dev-sw-reset" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: disableServiceWorkerScript }} />
        )}
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
