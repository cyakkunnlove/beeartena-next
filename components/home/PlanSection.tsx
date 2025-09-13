export default function PlanSection() {
  return (
    <section id="plan" className="py-20 bg-gradient-to-br from-light-accent to-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">安心プラン</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 3ヶ月プラン */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center relative">
            <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
              人気No.1
            </div>
            <h3 className="text-2xl font-bold mb-4">3ヶ月以内リタッチ</h3>
            <div className="text-4xl font-bold text-primary mb-4">¥11,000</div>
            <p className="text-gray-600 mb-6">
              初回施術から2回目完了後
              <br />
              <span className="font-semibold text-primary">3ヶ月以内の再施術</span>が
              <br />
              特別価格でご利用いただけます
            </p>

            <ul className="space-y-3 text-left">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">7日間: 保湿を忘れずに（お渡しする軟膏を1日2〜3回塗布）</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">1ヶ月後: 色が定着</span>
              </li>
            </ul>
          </div>

          {/* 半年プラン */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">半年リタッチプラン</h3>
            <div className="text-4xl font-bold text-primary mb-4">¥3,000</div>
            <p className="text-gray-600 mb-6">
              3ヶ月を過ぎて
              <br />
              <span className="font-semibold text-primary">半年以内の再施術</span>が
              <br />
              お得な価格でご利用いただけます
            </p>

            <ul className="space-y-3 text-left">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">色の定着を確実に</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">形の微調整も可能</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">いつも美しい眉をキープ</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
