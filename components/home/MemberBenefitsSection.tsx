import Link from 'next/link'

export default function MemberBenefitsSection() {
  const benefits = [
    {
      icon: '🎁',
      title: '5%ポイント還元',
      description: '施術料金の5%をポイント還元。次回の施術でご利用いただけます。',
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
        <p className="section-subtitle">無料会員登録で、お得な特典が盛りだくさん</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
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
