'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getActiveAnnouncements } from '@/lib/firebase/announcements'
import type { Announcement } from '@/lib/types'

export default function NewsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getActiveAnnouncements()
        setAnnouncements(data)
      } catch (error) {
        console.error('Failed to fetch announcements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (loading || announcements.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-serif text-primary">NEWS</h2>
            <div className="h-px bg-gray-300 flex-grow"></div>
            <span className="text-sm text-gray-500 tracking-widest">お知らせ</span>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {announcements.map((item) => (
              <article
                key={item.id}
                className="border-b border-gray-100 last:border-none p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 mb-2">
                  <time className="text-sm text-gray-500 font-medium min-w-[100px]">
                    {item.publishAt ? new Date(item.publishAt).toLocaleDateString('ja-JP') : ''}
                  </time>
                  <span
                    className={`
                    inline-block px-2 py-0.5 text-xs rounded border
                    ${
                      item.isPinned
                        ? 'border-red-200 text-red-600 bg-red-50'
                        : 'border-primary/20 text-primary bg-primary/5'
                    }
                  `}
                  >
                    {item.isPinned ? '重要' : 'お知らせ'}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
