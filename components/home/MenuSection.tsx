import Image from 'next/image'
import Link from 'next/link'

const menuItems = [
  {
    id: '2D',
    name: 'パウダーブロウ',
    description: 'ふんわりパウダー眉\nメイクしたような自然な仕上がり',
    price: 22000,
    monitorPrice: 20000,
    otherShopPrice: 35000,
    duration: '約2時間30分',
    image: '/images/2D.jpg',
  },
  {
    id: '3D',
    name: 'フェザーブロウ',
    description: '立体的な毛流れ眉\n1本1本丁寧に描く自然な眉',
    price: 23000,
    monitorPrice: 20000,
    otherShopPrice: 35000,
    duration: '約2時間30分',
    image: '/images/3D.jpg',
  },
  {
    id: '4D',
    name: 'パウダー&フェザー',
    description: '2D+3Dのいいとこ取り\n最も自然で立体的な仕上がり',
    price: 25000,
    monitorPrice: 22000,
    otherShopPrice: 40000,
    duration: '約2時間30分',
    image: '/images/4D.jpg',
    featured: true,
  },
]

export default function MenuSection() {
  return (
    <section id="menu" className="py-20 bg-light-accent">
      <div className="container mx-auto px-4">
        <h2 className="section-title">メニュー & 料金</h2>
        <p className="section-subtitle">2025年1月1日〜 新料金</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menuItems.map((item) => (
            <div key={item.id} className={`menu-card ${item.featured ? 'featured' : ''}`}>
              {item.featured && (
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 rounded-bl-lg rounded-tr-lg font-semibold">
                  人気No.1
                </div>
              )}

              <div className="text-4xl font-bold text-primary mb-4">{item.id}</div>
              <h3 className="text-2xl font-bold mb-2">{item.name}</h3>
              <p className="text-gray-600 mb-4 whitespace-pre-line">{item.description}</p>

              <div className="mb-4 h-48 relative overflow-hidden rounded-lg">
                <Image
                  src={item.image}
                  alt={`${item.name}の症例`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 45vw, 90vw"
                  className="object-cover"
                  priority={item.featured}
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <div className="text-sm text-gray-400 line-through decoration-red-500 decoration-2">
                    他店価格 ¥{item.otherShopPrice.toLocaleString()}
                  </div>
                  <div className="text-2xl font-bold">
                    当店価格 ¥{item.price.toLocaleString()}
                  </div>
                  <div className="text-xl font-bold text-primary">
                    モニター価格 ¥{item.monitorPrice.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm text-gray-500">所要時間：{item.duration}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 mt-8">
          ※モニター条件：施術写真撮影への協力ほか。詳細はお問い合わせください。
        </p>

        <div className="text-center mt-8">
          <Link href="/pricing" className="btn btn-primary btn-large">
            詳しい料金表を見る
          </Link>
        </div>
      </div>
    </section>
  )
}
