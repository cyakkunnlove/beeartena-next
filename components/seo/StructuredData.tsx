import { getAdminDb } from '@/lib/firebase/admin'
import { normalizeSettings } from '@/lib/utils/reservationSettings'

const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

async function getOpeningHours() {
  const db = getAdminDb()
  if (!db) return []

  try {
    const snap = await db.collection('settings').doc('reservation-settings').get()
    const settings = normalizeSettings(snap.exists ? (snap.data() as any) : null)

    // 同じ open/close の曜日をグループ化
    const groups = new Map<string, { days: string[]; opens: string; closes: string }>()
    for (const h of settings.businessHours) {
      if (!h.isOpen || !h.open || !h.close) continue
      const key = `${h.open}-${h.close}`
      const group = groups.get(key) ?? { days: [], opens: h.open, closes: h.close }
      group.days.push(dayOfWeekNames[h.dayOfWeek])
      groups.set(key, group)
    }

    return Array.from(groups.values()).map((g) => ({
      '@type': 'OpeningHoursSpecification' as const,
      dayOfWeek: g.days,
      opens: g.opens,
      closes: g.closes,
    }))
  } catch {
    return []
  }
}

export default async function StructuredData() {
  const openingHours = await getOpeningHours()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: 'BEE ART ENA',
    description: '理容師による安心のタトゥーメイクサロン',
    image: 'https://beeartena.vercel.app/images/topimageafter.png',
    url: 'https://beeartena.vercel.app',
    telephone: '090-5278-5221',
    priceRange: '¥¥',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '長島町正家1丁目1-25',
      addressLocality: '恵那市',
      addressRegion: '岐阜県',
      postalCode: '509-7203',
      addressCountry: 'JP',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 35.4494,
      longitude: 137.4123,
    },
    openingHoursSpecification: openingHours,
    sameAs: ['https://instagram.com/beeartena', 'https://line.me/R/ti/p/@174geemy'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'アートメイクメニュー',
      itemListElement: [
        {
          '@type': 'Offer',
          name: '毛並眉（4Dマシーン）',
          description: '1本1本丁寧に毛並みを再現する最高峰の眉アートメイク',
          price: '50000',
          priceCurrency: 'JPY',
        },
        {
          '@type': 'Offer',
          name: 'パウダー眉（マシーン）',
          description: 'ふんわりパウダー仕上げでメイクしたような自然な眉',
          price: '45000',
          priceCurrency: 'JPY',
        },
        {
          '@type': 'Offer',
          name: 'SMP（頭皮ドット）',
          description: '薄毛・傷跡をカバーするスカルプマイクロピグメンテーション',
          price: '15000',
          priceCurrency: 'JPY',
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
