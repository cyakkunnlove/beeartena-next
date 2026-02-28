export default function PlanSection() {
  const steps = [
    {
      num: '01',
      title: 'カウンセリング',
      desc: 'ご要望をお伺いし、骨格・表情に合わせた理想の眉をご提案します。',
    },
    {
      num: '02',
      title: 'デザイン',
      desc: '黄金比をベースに、お顔立ちに合ったデザインを一緒に決めていきます。',
    },
    {
      num: '03',
      title: '施術',
      desc: '麻酔クリームで痛みを最小限に。丁寧に色素を入れていきます。',
    },
    {
      num: '04',
      title: 'アフターケア',
      desc: 'ダウンタイムの過ごし方やケア方法を詳しくご説明します。',
    },
  ]

  return (
    <section id="plan" className="scroll-mt-24 py-20 bg-gradient-to-br from-light-accent to-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">施術の流れ</h2>
        <p className="section-subtitle">初めての方でも安心してお受けいただけます</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div key={step.num} className="bg-white rounded-2xl shadow-md p-6 text-center">
              <div className="text-4xl font-bold text-primary/20 mb-2">{step.num}</div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
