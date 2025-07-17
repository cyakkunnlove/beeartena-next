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
      description: 'お渡しする軟膏を1日2〜3回塗布',
    },
    {
      day: '4〜7日目',
      title: 'かさぶたが剥がれる時期',
      description: '自然に剥がれるのを待ちましょう',
    },
    {
      day: '1ヶ月後',
      title: '色が定着',
      description: 'きれいな仕上がりが完成します',
    },
  ];

  return (
    <section id="care" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">施術後ケアガイド</h2>
        
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
            アフターケアについてご不明な点がございましたら、お気軽にお問い合わせください
          </p>
          <a href="https://line.me/R/ti/p/@174geemy" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            LINEで相談する
          </a>
        </div>
      </div>
    </section>
  );
}