import Link from 'next/link'

export default function CareSection() {
  const careSteps = [
    {
      day: '施術当日',
      title: '優しくケア',
      description: '施術部位は触らず、清潔に保ちましょう',
    },
    {
      day: '1〜3日目',
      title: '保湿を忘れずに',
      description: 'お渡しするワセリンをこまめに塗布してください',
    },
    {
      day: '4〜7日目',
      title: 'かさぶたが剥がれる時期',
      description: '自然に剥がれるのを待ちましょう',
    },
    {
      day: '気になるとき',
      title: 'LINEですぐ相談',
      description: '不安な症状や気になることはLINEからご相談いただけます',
    },
  ]

  return (
    <section id="care" className="scroll-mt-24 py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">施術後ケアガイド</h2>
        <p className="section-subtitle">施術後の過ごし方を、期間ごとにわかりやすくご案内しています</p>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {careSteps.map((step, index) => (
              <div key={index} className="relative">
                {index < careSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-primary/30" />
                )}

                <div className="bg-light-accent rounded-xl p-6 text-center h-full">
                  <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold">
                    {index + 1}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{step.day}</div>
                  <h4 className="text-lg font-bold mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            詳しいアフターケア方法や、よくあるご質問を専用ページにまとめています
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/aftercare" className="btn btn-secondary">
              詳しいアフターケアを見る
            </Link>
            <a
              href="https://line.me/R/ti/p/@174geemy"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              LINEで相談する
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
