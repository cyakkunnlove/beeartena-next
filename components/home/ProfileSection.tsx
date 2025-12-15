import Image from 'next/image'

export default function ProfileSection() {
  return (
    <section id="profile" className="scroll-mt-24 py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="section-title">プロフィール</h2>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center">
              <Image
                src="/images/owner.png"
                alt="理容師プロフィール写真"
                width={400}
                height={400}
                className="rounded-2xl shadow-xl mx-auto"
              />
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-4">BEE ART ENA 代表</h3>
              <div className="flex gap-2 mb-6">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  理容師免許
                </span>
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  衛生管理責任者
                </span>
              </div>

              <p className="text-gray-600 mb-8 leading-relaxed">
                理容師として25年以上の経験を持ち、衛生管理を徹底した安全な施術を提供しています。
                お客様一人ひとりの骨格や表情に合わせた、自然で美しい眉デザインを心がけています。
              </p>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-lg mr-4">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">徹底した衛生管理</h4>
                    <p className="text-gray-600 text-sm">医療レベルの滅菌処理</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-lg mr-4">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">1日1名限定</h4>
                    <p className="text-gray-600 text-sm">丁寧なカウンセリングと施術</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-lg mr-4">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">アフターフォロー</h4>
                    <p className="text-gray-600 text-sm">施術後も安心のサポート</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
