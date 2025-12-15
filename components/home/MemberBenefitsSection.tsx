import Link from 'next/link'

export default function MemberBenefitsSection() {
  const benefits = [
    {
      icon: '📱',
      title: '予約をスムーズに',
      description: 'ログインするとお名前・連絡先の入力がスムーズになります。',
      highlight: true,
    },
    {
      icon: '🎂',
      title: '予約履歴の確認',
      description: '過去の予約をいつでも確認できます。',
    },
    {
      icon: '📝',
      title: 'プロフィール管理',
      description: '会員情報の更新や、必要情報の確認ができます。',
    },
    {
      icon: '💬',
      title: 'LINEで相談',
      description: '不安なことは公式LINEから気軽にご相談できます。',
    },
  ]

  return (
    <section id="member-benefits" className="py-20 bg-gradient-to-br from-primary/5 to-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">会員特典</h2>
        <p className="section-subtitle">
          <span className="text-2xl font-bold text-primary">会員登録</span>で、予約がより便利になります
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow ${
                benefit.highlight ? 'ring-2 ring-primary relative' : ''
              }`}
            >
              {benefit.highlight && (
                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  人気
                </div>
              )}
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className="text-gray-600 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/register" className="btn btn-primary btn-large">
            今すぐ無料会員登録
          </Link>
          <p className="text-gray-600 mt-4">※登録は1分で完了します</p>
        </div>
      </div>
    </section>
  )
}
