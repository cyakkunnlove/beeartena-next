'use client'

import { useState } from 'react'

const faqs = [
  {
    question: '痛みはありますか？',
    answer:
      '施術前に適切な処置を行いますので、痛みはほとんど感じません。チクチクする程度の感覚です。',
  },
  {
    question: 'どのくらい持続しますか？',
    answer:
      '個人差はありますが、通常1〜2年程度持続します。半年〜1年ごとのリタッチで美しい状態を保てます。',
  },
  {
    question: '施術当日のメイクは？',
    answer: '眉メイクはせずにお越しください。その他のメイクは通常通りで問題ありません。',
  },
  {
    question: '施術時間はどのくらい？',
    answer: 'カウンセリングを含めて約2時間30分です。初回は特に丁寧にカウンセリングを行います。',
  },
  {
    question: 'アレルギーがある場合は？',
    answer: '事前にパッチテストを行うことができます。アレルギーが心配な方はご相談ください。',
  },
  {
    question: '施術後すぐに仕事はできますか？',
    answer:
      'はい、施術後すぐに通常の生活に戻れます。ただし、激しい運動や長時間の入浴は避けてください。',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="section-title">よくある質問</h2>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-4">
              <button
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <svg
                    className={`w-6 h-6 text-primary transform transition-transform duration-300 ${
                      openIndex === index ? 'rotate-45' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="bg-white px-4 pb-4 pt-2">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">その他のご質問はお気軽にお問い合わせください</p>
          <a href="#reservation" className="btn btn-primary">
            お問い合わせする
          </a>
        </div>
      </div>
    </section>
  )
}
