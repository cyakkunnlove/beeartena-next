export default function PlanSection() {
  return (
    <section id="plan" className="py-20 bg-gradient-to-br from-light-accent to-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">安心プラン</h2>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">半年以内リタッチ</h3>
            <div className="text-5xl font-bold text-primary mb-6">¥11,000</div>
            <p className="text-lg text-gray-600 mb-8">
              初回施術から2回目完了後、半年以内の再施術が<br />
              特別価格でご利用いただけます
            </p>
            
            <ul className="space-y-4 text-left max-w-md mx-auto">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>色の定着を確実に</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>形の微調整も可能</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>いつも美しい眉をキープ</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}