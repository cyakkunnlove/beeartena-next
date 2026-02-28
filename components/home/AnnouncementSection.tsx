'use client'

import { useEffect, useState } from 'react'

import { getActiveAnnouncements } from '@/lib/firebase/announcements'
import type { Announcement } from '@/lib/types'

const formatDate = (value?: string | Date | null) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export default function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveAnnouncements()
        // ピン留め → 優先度 → 新しい順
        const sorted = [...data].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          if (b.priority !== a.priority) return b.priority - a.priority
          return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
        })
        setAnnouncements(sorted)
      } catch (error) {
        console.error('Failed to load announcements:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || announcements.length === 0) return null

  return (
    <section className="py-8 bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-6">
          <span className="inline-flex items-center gap-2">
            📢 お知らせ
          </span>
        </h2>

        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-5 shadow-sm transition-all ${
                item.isPinned
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {item.isPinned && (
                  <span className="mt-0.5 text-amber-500 text-lg flex-shrink-0" aria-label="ピン留め">📌</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <time className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(item.publishAt)}
                    </time>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
