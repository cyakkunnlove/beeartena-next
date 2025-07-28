'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { Inquiry } from '@/lib/types'

export default function AdminInquiries() {
  const router = useRouter()
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    loadInquiries()
  }, [user, router])

  const loadInquiries = () => {
    const allInquiries = storageService.getAllInquiries()
    setInquiries(
      allInquiries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    )
  }

  const handleStatusUpdate = (inquiryId: string, status: 'read' | 'unread') => {
    storageService.updateInquiryStatus(inquiryId, status)
    loadInquiries()
  }

  const filteredInquiries =
    filter === 'all' ? inquiries : inquiries.filter((i) => i.status === filter)

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">お問い合わせ管理</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-primary hover:text-dark-gold"
            >
              ← 管理画面に戻る
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            {(['all', 'unread', 'read'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '全て' : status === 'unread' ? '未読' : '既読'}
                {status !== 'all' && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {inquiries.filter((i) => i.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Inquiries List */}
        <div className="space-y-4">
          {filteredInquiries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600">該当するお問い合わせがありません</p>
            </div>
          ) : (
            filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  inquiry.status === 'unread' ? 'border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">{inquiry.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          inquiry.status === 'unread'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inquiry.status === 'unread' ? '未読' : '既読'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>メール: {inquiry.email}</p>
                      <p>電話: {inquiry.phone}</p>
                      <p>日時: {new Date(inquiry.createdAt).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="whitespace-pre-wrap">{inquiry.message}</p>
                </div>

                <div className="flex gap-3">
                  {inquiry.status === 'unread' ? (
                    <button
                      onClick={() => handleStatusUpdate(inquiry.id, 'read')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold text-sm"
                    >
                      既読にする
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusUpdate(inquiry.id, 'unread')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      未読に戻す
                    </button>
                  )}
                  <a
                    href={`mailto:${inquiry.email}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    メールで返信
                  </a>
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    電話をかける
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
