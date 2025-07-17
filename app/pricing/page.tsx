import Image from 'next/image';
import Link from 'next/link';

const services = [
  {
    id: '2D',
    name: 'パウダーブロウ',
    description: 'ふんわりパウダー眉。メイクしたような自然な仕上がり',
    price: 20000,
    monitorPrice: 18000,
    duration: '約2時間',
    image: '/images/2D.jpg',
    features: [
      'パウダーメイクのような仕上がり',
      'ナチュラルで優しい印象',
      'メイク時間短縮',
      'すっぴんでも自然な眉',
    ],
    process: [
      'カウンセリング（30分）',
      'デザイン決定（30分）',
      '施術（60分）',
      'アフターケア説明（10分）',
    ],
  },
  {
    id: '3D',
    name: 'フェザーブロウ',
    description: '立体的な毛流れ眉。1本1本丁寧に描く自然な眉',
    price: 20000,
    monitorPrice: 18000,
    duration: '約2時間',
    image: '/images/3D.jpg',
    features: [
      '毛並みを1本1本再現',
      '自眉のような自然さ',
      '立体的な仕上がり',
      '男性にも人気',
    ],
    process: [
      'カウンセリング（30分）',
      'デザイン決定（30分）',
      '施術（60分）',
      'アフターケア説明（10分）',
    ],
  },
  {
    id: '4D',
    name: 'パウダー&フェザー',
    description: '2D+3Dのいいとこ取り。最も自然で立体的な仕上がり',
    price: 25000,
    monitorPrice: 22000,
    duration: '約2時間',
    image: '/images/4D.jpg',
    featured: true,
    features: [
      'パウダーとフェザーの融合',
      '最も自然な仕上がり',
      '立体感のある美眉',
      '幅広い年齢層に人気',
    ],
    process: [
      'カウンセリング（30分）',
      'デザイン決定（30分）',
      '施術（60分）',
      'アフターケア説明（10分）',
    ],
  },
];

const additionalServices = [
  {
    name: 'リタッチ（半年以内）',
    price: 11000,
    description: '初回施術から2回目完了後、半年以内の再施術',
  },
  {
    name: 'リタッチ（1年以内）',
    price: 15000,
    description: '半年を過ぎて1年以内の再施術',
  },
  {
    name: 'カラー変更',
    price: 3000,
    description: 'リタッチ時のカラー変更オプション',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-br from-primary/10 to-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-gradient">
            メニュー & 料金
          </h1>
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto">
            理容師による安心・安全な施術。
            お客様の骨格や表情に合わせた、あなただけの美眉をデザインします。
          </p>
        </div>
      </section>

      {/* サービス詳細 */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="space-y-16">
            {services.map((service, index) => (
              <div
                key={service.id}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden ${
                  service.featured ? 'ring-2 ring-primary' : ''
                }`}
              >
                {service.featured && (
                  <div className="bg-primary text-white text-center py-2 font-semibold">
                    人気No.1
                  </div>
                )}
                
                <div className={`grid grid-cols-1 lg:grid-cols-2 ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}>
                  {/* 画像 */}
                  <div className={`relative h-64 lg:h-auto ${
                    index % 2 === 1 ? 'lg:order-2' : ''
                  }`}>
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* 内容 */}
                  <div className="p-8 lg:p-12">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-3xl font-bold mb-2">{service.id} {service.name}</h2>
                        <p className="text-gray-600">{service.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <h3 className="font-semibold mb-3">特徴</h3>
                        <ul className="space-y-2">
                          {service.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary">✓</span>
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">施術の流れ</h3>
                        <ul className="space-y-2">
                          {service.process.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary font-semibold">{i + 1}.</span>
                              <span className="text-sm">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-3xl font-bold text-primary">
                            ¥{service.price.toLocaleString()}
                          </p>
                          <p className="text-lg text-gray-600">
                            モニター価格 ¥{service.monitorPrice.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            所要時間: {service.duration}
                          </p>
                        </div>
                        <Link href="/reservation" className="btn btn-primary">
                          このメニューで予約する
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 追加メニュー */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">追加メニュー</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {additionalServices.map((service) => (
              <div key={service.name} className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                <p className="text-2xl font-bold text-primary mb-3">
                  ¥{service.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* モニター条件 */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">モニター価格について</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">モニター条件</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>施術前後の写真撮影にご協力いただける方</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>SNSやホームページへの写真掲載を許可いただける方</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>アンケートにご協力いただける方</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">注意事項</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>個人が特定されないよう配慮いたします</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>目元のみの撮影も可能です</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>詳細はカウンセリング時にご相談ください</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary to-dark-gold text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">まずは無料カウンセリングから</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            お客様のご希望をじっくりお伺いし、最適なメニューをご提案いたします。
            カウンセリングのみのご来店も歓迎です。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservation" className="btn bg-white text-primary hover:bg-gray-100">
              カウンセリング予約
            </Link>
            <a
              href="https://line.me/R/ti/p/@174geemy"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-green-600 text-white hover:bg-green-700"
            >
              LINEで相談する
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}