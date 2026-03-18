import Link from 'next/link'

const summaryPoints = [
  {
    icon: '✋',
    title: 'こすらない・触りすぎない',
    description: 'かゆみがあっても強く触れず、施術部位はやさしく扱ってください。',
  },
  {
    icon: '💧',
    title: '水濡れや汗を避ける',
    description: '1週間程度は濡らしすぎないよう意識し、シャワー時はワセリンで保護しましょう。',
  },
  {
    icon: '🧴',
    title: 'ワセリンで保湿する',
    description: '乾燥を防ぎ、色素の定着を助けるため、こまめな保湿が大切です。',
  },
  {
    icon: '🩹',
    title: 'かさぶたは無理に剥がさない',
    description: '自然に剥がれるまで待つことで、色ムラや刺激を防ぎやすくなります。',
  },
]

const periods = [
  {
    label: '📅 施術当日',
    title: '洗顔・クレンジングはやさしく',
    items: [
      {
        heading: '🧼 洗顔・クレンジング',
        body: 'お肌を強くこすらないようにしてください。メイク落としシートでやさしく拭き取る程度にし、洗顔料やクレンジングの使用はお控えください。',
      },
      {
        heading: '🧤 清潔に保つ',
        body: '施術部位は必要以上に触らず、清潔な状態を保ってお過ごしください。',
      },
    ],
  },
  {
    label: '🚿 施術後24時間以降',
    title: '洗顔は可能ですが、こすらずやさしく',
    items: [
      {
        heading: '🫧 洗顔',
        body: '洗顔は可能ですが、施術箇所をゴシゴシ洗わず、やさしく触れる程度にしてください。',
      },
      {
        heading: '💡 ポイント',
        body: 'タオルで拭く際も、こすらずに押さえるように水分を取ってください。',
      },
    ],
  },
  {
    label: '💧 施術後1週間以内',
    title: '保湿と刺激回避がとても大切です',
    items: [
      {
        heading: '🚿 水濡れ・汗',
        body: '施術箇所はなるべく濡らさないようにしてください。シャワーや洗顔の際は、ワセリンをたっぷり塗って保護するのがおすすめです。',
      },
      {
        heading: '🧴 保湿',
        body: 'お渡ししたワセリンをこまめに塗り、乾燥を防いでください。感染予防・保湿・色素の定着を助けるために大切です。',
      },
      {
        heading: '⏰ ワセリンの目安',
        body: '施術当日〜3日目は1日4〜6回、4〜7日目は朝と晩の2回を目安に薄く塗ってください。',
      },
      {
        heading: '✋ 触る・こする',
        body: 'かゆみがあっても触ったりこすったりしないでください。炎症や感染、色ムラの原因になることがあります。',
      },
      {
        heading: '🩹 かさぶた',
        body: '無理に剥がさず、自然に剥がれるまでお待ちください。',
      },
      {
        heading: '☀️ 紫外線対策',
        body: '帽子や日傘などを使って、施術箇所を紫外線から守りましょう。',
      },
    ],
    note: '※ ワセリンを塗る際は、清潔な手または綿棒をご使用ください。',
  },
  {
    label: '🌿 施術後1週間以降',
    title: '徐々にいつものケアへ戻していきます',
    items: [
      {
        heading: '💄 メイク・日焼け止め',
        body: '施術部位へのメイクや日焼け止めは、1週間後を目安にご使用いただけます。',
      },
      {
        heading: '🧼 クレンジング',
        body: '色持ちを良くするため、刺激の強いクレンジング剤はなるべくお控えください。',
      },
      {
        heading: '💪 運動・飲酒',
        body: '血行が良くなると色素が抜けやすくなるため、施術後3日間は激しい運動や飲酒をお控えください。',
      },
      {
        heading: '🌸 仕上がりを保つために',
        body: '清潔を保ち、摩擦や刺激を避けながら、やさしいスキンケアを続けてください。',
      },
    ],
  },
]

const faqItems = [
  {
    question: '洗顔はいつからできますか？',
    answer: '施術後24時間以降から可能です。ただし、施術部位はゴシゴシ洗わず、やさしく触れる程度にしてください。',
  },
  {
    question: 'ワセリンはどのくらい塗ればよいですか？',
    answer: '施術当日〜3日目は1日4〜6回、4〜7日目は朝晩2回を目安に薄く塗ってください。塗る際は清潔な手または綿棒をご使用ください。',
  },
  {
    question: 'かさぶたができても大丈夫ですか？',
    answer: 'はい、施術後にかさぶたができることがあります。無理に剥がさず、自然に取れるのを待ってください。剥がしてしまうと色ムラの原因になることがあります。',
  },
  {
    question: 'メイクはいつからできますか？',
    answer: '施術部位へのメイクや日焼け止めは、1週間後を目安にご使用いただけます。',
  },
  {
    question: '運動や飲酒はいつから大丈夫ですか？',
    answer: '血行が良くなると色素が抜けやすくなるため、施術後3日間は激しい運動や飲酒をお控えください。',
  },
]

export default function AftercarePage() {
  return (
    <main className="pt-24 pb-20">
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-primary font-semibold tracking-[0.2em] text-sm mb-4">AFTER CARE GUIDE</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">施術後のアフターケアについて</h1>
            <p className="text-gray-600 leading-8 text-base md:text-lg">
              施術後のお肌は一時的にとてもデリケートな状態です。<br />
              きれいな仕上がりを保つために、期間ごとのケア方法をご確認ください。
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="section-title">まず大切な4つのポイント</h2>
            <p className="section-subtitle">まずはここだけ押さえていただければ大丈夫です</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
              {summaryPoints.map((point) => (
                <div key={point.title} className="card bg-white/95 border border-primary/10">
                  <div className="text-3xl mb-4">{point.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{point.title}</h3>
                  <p className="text-gray-600 leading-7">{point.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 md:p-8 border-l-4 border-primary">
              <h3 className="text-xl font-bold mb-4">ご注意いただきたいこと</h3>
              <ul className="space-y-3 text-gray-700 leading-7">
                <li>・施術部位をゴシゴシ洗わない</li>
                <li>・施術後3日間は激しい運動・飲酒を控える</li>
                <li>・紫外線や摩擦などの刺激をできるだけ避ける</li>
                <li>・気になる症状がある場合は無理せずLINEでご相談ください</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white/70">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="section-title">期間ごとのケア方法</h2>
            <p className="section-subtitle">今の時期に合わせてご確認ください</p>

            <div className="space-y-6 mt-10">
              {periods.map((period) => (
                <article key={period.label} className="card p-6 md:p-8">
                  <p className="text-primary font-semibold mb-3">{period.label}</p>
                  <h3 className="text-2xl font-bold mb-6">{period.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {period.items.map((item) => (
                      <div key={item.heading} className="bg-light-bg rounded-xl p-5">
                        <h4 className="font-semibold text-lg mb-2">{item.heading}</h4>
                        <p className="text-gray-600 leading-7">{item.body}</p>
                      </div>
                    ))}
                  </div>
                  {period.note && <p className="text-sm text-gray-500 mt-5">{period.note}</p>}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="section-title">よくあるご質問</h2>
            <p className="section-subtitle">気になる内容をまとめています</p>

            <div className="space-y-4 mt-10">
              {faqItems.map((faq) => (
                <details key={faq.question} className="bg-white rounded-xl shadow-md p-5 group">
                  <summary className="list-none cursor-pointer flex items-center justify-between gap-4">
                    <span className="font-semibold text-lg">{faq.question}</span>
                    <span className="text-primary text-2xl leading-none group-open:rotate-45 transition-transform">＋</span>
                  </summary>
                  <p className="text-gray-600 leading-7 mt-4">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pt-4 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto card p-8 md:p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">ご不安な点がある場合はLINEでご相談ください</h2>
            <p className="text-gray-600 leading-8 mb-8">
              施術後の状態には個人差があります。<br />
              気になる症状やご不明点がある場合は、LINEよりお気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://line.me/R/ti/p/@174geemy"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                LINEで相談する
              </a>
              <Link href="/reservation" className="btn btn-secondary">
                予約ページを見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
