'use client';

import { useState } from 'react';
import Link from 'next/link';
import { storageService } from '@/lib/storage/storageService';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Save inquiry to local storage
      storageService.createInquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        type: formData.inquiryType as any,
        message: formData.message,
      });

      setSubmitMessage('お問い合わせを受け付けました。ご連絡ありがとうございます。');
      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: '',
        message: '',
      });
    } catch (error) {
      setSubmitMessage('送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reservation" className="py-20 bg-white">
      <div className="container mx-auto px-4">
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
                <Link href="/reservation" className="flex items-center gap-4 text-primary hover:text-dark-gold transition-colors">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="input-group">
                <label htmlFor="name" className="input-label">
                  お名前 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label htmlFor="email" className="input-label">
                  メールアドレス *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label htmlFor="phone" className="input-label">
                  電話番号
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label htmlFor="inquiryType" className="input-label">
                  お問い合わせ内容 *
                </label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">選択してください</option>
                  <option value="general">一般的なご質問</option>
                  <option value="menu">メニュー・料金について</option>
                  <option value="booking">予約について</option>
                  <option value="aftercare">アフターケアについて</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>

            <div className="input-group mt-6">
              <label htmlFor="message" className="input-label">
                お問い合わせ内容 *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                required
                placeholder="ご質問やご相談内容をお聞かせください"
                className="input-field"
              />
            </div>

            {submitMessage && (
              <div className={`mt-4 p-4 rounded-lg ${submitMessage.includes('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {submitMessage}
              </div>
            )}

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
      </div>
    </section>
  );
}