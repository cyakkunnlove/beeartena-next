import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-light-accent to-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient block">理容師が創る、あなただけの美眉</span>
              <span className="text-2xl md:text-3xl text-gray-700 font-normal mt-4 block">
                1日1名限定のプレミアムタトゥーメイク
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              国家資格を持つ理容師による安全・安心の施術<br />
              半年以内リタッチ11,000円の安心プラン
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/reservation" className="btn btn-primary btn-large">
                今すぐ予約する
              </Link>
              <Link href="/pricing" className="btn btn-secondary">
                メニューを見る
              </Link>
              <Link href="/login" className="btn btn-outline">
                会員登録（5%ポイント還元）
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="before-after">
              <div className="before-after-item">
                <Image
                  src="/images/topimagebefore.png"
                  alt="施術前"
                  width={300}
                  height={300}
                  className="rounded-xl shadow-lg"
                />
                <span className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-semibold">
                  Before
                </span>
              </div>
              <div className="before-after-arrow">→</div>
              <div className="before-after-item">
                <Image
                  src="/images/topimageafter.png"
                  alt="施術後"
                  width={300}
                  height={300}
                  className="rounded-xl shadow-lg"
                />
                <span className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-semibold">
                  After
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}