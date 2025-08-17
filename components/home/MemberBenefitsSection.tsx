import Link from 'next/link'

export default function MemberBenefitsSection() {
  const benefits = [
    {
      icon: '🎁',
      title: '5%ポイント還元',
      description: '施術料金の5%をポイント還元。次回の施術でご利用いただけます。',
      highlight: true,
    },
    {
      icon: '📱',
      title: '予約履歴管理',
      description: '過去の施術履歴をいつでも確認。次回予約の参考に。',
    },
    {
      icon: '🎂',
      title: '誕生日特典',
      description: 'お誕生日月に特別クーポンをプレゼント。',
    },
    {
      icon: '⭐',
      title: '会員ランク制度',
      description: '利用回数に応じてランクアップ。上位ランクほどお得な特典が。',
    },
  ]

  return (
    <section id="member-benefits" className="py-20 bg-gradient-to-br from-primary/5 to-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">会員特典</h2>
        <p className="section-subtitle">
          <span className="text-2xl font-bold text-primary">無料会員登録</span>で、お得な特典が盛りだくさん
        </p>

        {/* ポイント還元の強調バナー */}
        <div className="max-w-3xl mx-auto mb-12 bg-gradient-to-r from-primary to-dark-gold text-white rounded-2xl p-8 shadow-xl">
          <div className="text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-3xl font-bold mb-4">会員登録で5%ポイント還元</h3>
            <p className="text-lg mb-2">
              施術料金の<span className="text-2xl font-bold mx-1">5%</span>が必ずポイントバック！
            </p>
            <p className="text-sm opacity-90">
              例：¥22,000の施術で1,100ポイント獲得 → 次回¥1,100割引
            </p>
          </div>
        </div>

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
