'use client'

import Link from 'next/link'
import { useState } from 'react'

import FormField from '@/components/form/FormField'
import { useToastContext } from '@/components/layout/LayoutWrapper'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import Skeleton, { CardSkeleton } from '@/components/ui/Skeleton'
import { storageService } from '@/lib/storage/storageService'

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastContext()

  const handleFieldChange = (name: string) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save inquiry to local storage
      storageService.createInquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        type: formData.inquiryType as any,
        message: formData.message,
      })

      toast.showToast({
        type: 'success',
        title: 'お問い合わせを受け付けました',
        message: 'ご連絡ありがとうございます。',
      })

      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: '',
        message: '',
      })
    } catch (error) {
      toast.showToast({
        type: 'error',
        title: '送信に失敗しました',
        message: 'もう一度お試しください。',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="py-20 bg-white">
        <ResponsiveContainer maxWidth="xl">
          <div className="text-center mb-12">
            <Skeleton variant="text" width={300} height={40} className="mx-auto mb-4" />
            <Skeleton variant="text" width={500} height={20} className="mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </ResponsiveContainer>
      </section>
    )
  }

  return (
    <section id="reservation" className="py-12 sm:py-16 md:py-20 bg-white">
      <ResponsiveContainer maxWidth="xl">
        <h2 className="section-title">お問い合わせ・ご相談</h2>
        <p className="section-subtitle">
          お気軽にご相談ください。ご予約は専用ページよりお手続きください。
        </p>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">営業時間</h3>
              <div className="space-y-2">
                <div>
                  <strong>水曜日：</strong>9:00〜17:00
                </div>
                <div>
                  <strong>水曜以外：</strong>18:30〜（眉施術）/ 18:30 or 19:30〜（頭皮施術）
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">お問い合わせ方法</h3>
              <div className="space-y-4">
                <Link
                  href="/reservation"
                  className="flex items-center gap-4 text-primary hover:text-dark-gold transition-colors"
                >
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold">オンライン予約</h4>
                    <p className="text-sm text-gray-600">24時間受付可能</p>
                  </div>
                </Link>

                <a
                  href="https://line.me/R/ti/p/@174geemy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 text-primary hover:text-dark-gold transition-colors"
                >
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold">LINE相談</h4>
                    <p className="text-sm text-gray-600">気軽にご質問ください</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                id="name"
                name="name"
                label="お名前"
                type="text"
                value={formData.name}
                onChange={handleFieldChange('name')}
                required
                placeholder="田中太郎"
                validateOnChange
              />

              <FormField
                id="email"
                name="email"
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={handleFieldChange('email')}
                required
                placeholder="example@email.com"
                validateOnChange
              />

              <FormField
                id="phone"
                name="phone"
                label="電話番号"
                type="tel"
                value={formData.phone}
                onChange={handleFieldChange('phone')}
                placeholder="090-1234-5678"
                validateOnChange
              />

              <FormField
                id="inquiryType"
                name="inquiryType"
                label="お問い合わせ種別"
                type="select"
                value={formData.inquiryType}
                onChange={handleFieldChange('inquiryType')}
                required
                options={[
                  { value: 'general', label: '一般的なご質問' },
                  { value: 'menu', label: 'メニュー・料金について' },
                  { value: 'booking', label: '予約について' },
                  { value: 'aftercare', label: 'アフターケアについて' },
                  { value: 'other', label: 'その他' },
                ]}
              />
            </div>

            <div className="mt-6">
              <FormField
                id="message"
                name="message"
                label="お問い合わせ内容"
                type="textarea"
                value={formData.message}
                onChange={handleFieldChange('message')}
                required
                placeholder="ご質問やご相談内容をお聞かせください"
                rows={5}
                validationRules={[
                  {
                    test: (val) => val.length >= 10,
                    message: '10文字以上入力してください',
                  },
                ]}
              />
            </div>

            <div className="mt-8 text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-large disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '送信中...' : 'お問い合わせを送信'}
              </button>
              <p className="text-gray-600 mt-4">※ご返信には1〜2営業日いただく場合がございます</p>
              <div className="mt-6">
                <Link href="/reservation" className="btn btn-secondary">
                  予約ページへ進む
                </Link>
              </div>
            </div>
          </form>
        </div>
      </ResponsiveContainer>
    </section>
  )
}
