'use client'

import Link from 'next/link'
import PageTransition from '@/components/layout/PageTransition'

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">プライバシーポリシー</h1>
            
            <div className="prose prose-gray max-w-none">
              <p className="mb-6">
                BEE ART ENA（以下、「当サロン」といいます。）は、お客様の個人情報の保護に努めております。
                本プライバシーポリシーは、当サロンがどのような個人情報を収集し、どのように利用・管理するかについて定めたものです。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">1. 個人情報の定義</h2>
              <p className="mb-4">
                個人情報とは、個人に関する情報であり、氏名、生年月日、住所、電話番号、メールアドレス、その他の記述等により特定の個人を識別できる情報を指します。
                また、施術の安全管理を目的として取得する健康状態、アレルギー、既往歴、服薬状況などの情報（以下「健康・施術関連情報」）も個人情報として適切に取り扱います。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. 個人情報の収集</h2>
              <p className="mb-4">
                当サロンは、以下の場合に個人情報を収集することがあります。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">会員登録をいただく場合</li>
                <li className="mb-2">予約をいただく場合</li>
                <li className="mb-2">施術前問診フォームへご回答いただく場合</li>
                <li className="mb-2">お問い合わせをいただく場合</li>
                <li className="mb-2">施術記録を作成する場合</li>
                <li className="mb-2">その他、サービス提供に必要な場合</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. 個人情報の利用目的</h2>
              <p className="mb-4">
                当サロンは、収集した個人情報を以下の目的で利用します。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">予約の管理・確認のため</li>
                <li className="mb-2">施術サービスの提供のため</li>
                <li className="mb-2">施術の安全管理および衛生管理のため</li>
                <li className="mb-2">お客様への連絡・通知のため</li>
                <li className="mb-2">ポイントサービスの管理のため</li>
                <li className="mb-2">施術記録の管理・保管のため</li>
                <li className="mb-2">アフターケアのご案内のため</li>
                <li className="mb-2">サービスの品質向上・新サービス開発のため</li>
                <li className="mb-2">統計データの作成（個人を特定できない形式）</li>
                <li className="mb-2">法令に基づく対応のため</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. 個人情報の第三者提供</h2>
              <p className="mb-4">
                当サロンは、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">お客様の同意がある場合</li>
                <li className="mb-2">法令に基づく場合</li>
                <li className="mb-2">人の生命、身体または財産の保護のために必要な場合で、お客様の同意を得ることが困難な場合</li>
                <li className="mb-2">公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合で、お客様の同意を得ることが困難な場合</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. 個人情報の管理</h2>
              <p className="mb-4">
                当サロンは、お客様の個人情報を正確かつ最新の状態に保ち、個人情報への不正アクセス、紛失、破損、改ざん、漏洩などを防止するため、
                セキュリティシステムの維持・管理体制の整備・従業員教育の徹底等の必要な措置を講じ、安全対策を実施し個人情報の厳重な管理を行います。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. 個人情報の開示・訂正・削除</h2>
              <p className="mb-4">
                お客様がご自身の個人情報の開示・訂正・削除をご希望される場合には、ご本人であることを確認の上、対応させていただきます。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Cookie（クッキー）の使用について</h2>
              <p className="mb-4">
                当サロンのウェブサイトでは、お客様により良いサービスを提供するため、Cookie（クッキー）を使用することがあります。
                Cookieは、お客様のコンピューターを識別することはできますが、お客様個人を特定することはできません。
                お客様は、ブラウザの設定によりCookieの受け取りを拒否することができます。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. SSL（Secure Socket Layer）について</h2>
              <p className="mb-4">
                当サロンのウェブサイトでは、お客様の個人情報を保護するため、SSLに対応しています。
                SSL対応のブラウザを使用することで、お客様が入力される情報は自動的に暗号化されて送受信されます。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. プライバシーポリシーの変更</h2>
              <p className="mb-4">
                当サロンは、必要に応じて、本プライバシーポリシーを変更することがあります。
                変更した場合には、ウェブサイト上に掲載することにより通知します。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. 健康・施術関連情報の取扱い</h2>
              <p className="mb-4">
                施術前問診等を通じて取得した健康・施術関連情報は、施術の可否判断および安全管理の目的に限定して利用し、適切なアクセス制御のもとで保管します。
                お客様から訂正・削除の申し出があった場合には、施術履歴との整合性を確認のうえ速やかに対応します。
                また、第三者提供が必要となる際には、法令に基づく場合を除き、お客様の明示的な同意を得ます。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. お問い合わせ</h2>
              <p className="mb-4">
                当サロンの個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
              </p>
              <div className="bg-gray-100 p-4 rounded mb-4">
                <p className="mb-2"><strong>BEE ART ENA</strong></p>
                <p className="mb-1">〒509-7203 岐阜県恵那市長島町正家1丁目1-25 カットハウス恵那</p>
                <p className="mb-1">TEL: 090-5278-5221</p>
                <p>Email: info@beeartena.jp</p>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-300">
                <p className="text-right text-gray-600">
                  制定日：2024年1月1日<br />
                  最終改定日：2025年10月6日
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/register" className="text-primary hover:text-dark-gold">
                会員登録ページへ戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}