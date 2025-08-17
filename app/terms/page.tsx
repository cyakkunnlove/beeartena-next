'use client'

import Link from 'next/link'
import PageTransition from '@/components/layout/PageTransition'

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">利用規約</h1>
            
            <div className="prose prose-gray max-w-none">
              <p className="mb-6">
                この利用規約（以下、「本規約」といいます。）は、BEE ART ENA（以下、「当サロン」といいます。）が提供するアートメイクサービス（以下、「本サービス」といいます。）の利用条件を定めるものです。
                会員登録をされた方（以下、「会員」といいます。）には、本規約に同意いただいたものとみなします。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第1条（適用）</h2>
              <p className="mb-4">
                本規約は、会員と当サロンとの間の本サービスの利用に関わる一切の関係に適用されるものとします。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第2条（会員登録）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  本サービスの利用を希望する方は、本規約に同意の上、当サロンの定める方法により会員登録を申請するものとします。
                </li>
                <li className="mb-2">
                  当サロンは、前項の申請があった場合、当サロンの基準により審査を行い、承認する場合には会員登録を完了するものとします。
                </li>
                <li className="mb-2">
                  会員は、登録情報に変更があった場合、速やかに当サロンに通知するものとします。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第3条（サービス内容）</h2>
              <p className="mb-4">
                当サロンは、会員に対し、以下のサービスを提供します。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">アートメイク施術サービス</li>
                <li className="mb-2">オンライン予約サービス</li>
                <li className="mb-2">ポイントサービス</li>
                <li className="mb-2">その他当サロンが定めるサービス</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第4条（料金および支払方法）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  会員は、本サービスの利用にあたり、当サロンが定める料金を支払うものとします。
                </li>
                <li className="mb-2">
                  料金の支払方法は、現金、クレジットカード、その他当サロンが指定する方法によるものとします。
                </li>
                <li className="mb-2">
                  一度支払われた料金は、本規約に特段の定めがある場合を除き、返金されないものとします。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第5条（予約およびキャンセル）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  会員は、当サロンの定める方法により施術の予約を行うことができます。
                </li>
                <li className="mb-2">
                  予約のキャンセルは、予約日の24時間前までに行うものとします。
                </li>
                <li className="mb-2">
                  前項の期限を過ぎてのキャンセル、または無断キャンセルの場合、当サロンは会員に対してキャンセル料を請求する場合があります。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第6条（ポイントサービス）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  会員は、施術料金の支払い時に、支払金額の5%相当のポイントを獲得できます。
                </li>
                <li className="mb-2">
                  獲得したポイントは、次回以降の施術料金の支払いに1ポイント1円として利用できます。
                </li>
                <li className="mb-2">
                  ポイントの有効期限は、最後にポイントを獲得または利用した日から1年間とします。
                </li>
                <li className="mb-2">
                  ポイントは、現金との交換はできません。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第7条（禁止事項）</h2>
              <p className="mb-4">
                会員は、本サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">法令または公序良俗に違反する行為</li>
                <li className="mb-2">当サロンまたは第三者の権利を侵害する行為</li>
                <li className="mb-2">当サロンのサービスの運営を妨害する行為</li>
                <li className="mb-2">虚偽の情報を登録する行為</li>
                <li className="mb-2">他の会員のアカウントを利用する行為</li>
                <li className="mb-2">その他、当サロンが不適切と判断する行為</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第8条（施術に関する注意事項）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  以下に該当する方は、施術を受けることができません。
                  <ul className="list-disc pl-6 mt-2">
                    <li>妊娠中または授乳中の方</li>
                    <li>施術部位に皮膚疾患のある方</li>
                    <li>重篤なアレルギー体質の方</li>
                    <li>その他、当サロンが施術不適当と判断した方</li>
                  </ul>
                </li>
                <li className="mb-2">
                  会員は、施術前に健康状態や既往症について正確に申告するものとします。
                </li>
                <li className="mb-2">
                  施術後のアフターケアについては、当サロンの指示に従うものとします。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第9条（個人情報の取り扱い）</h2>
              <p className="mb-4">
                当サロンは、会員の個人情報を適切に管理し、以下の目的にのみ利用します。
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li className="mb-2">本サービスの提供</li>
                <li className="mb-2">会員への連絡</li>
                <li className="mb-2">サービスの品質向上のための分析</li>
                <li className="mb-2">法令に基づく開示請求への対応</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第10条（免責事項）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  当サロンは、本サービスに関して、その安全性、正確性、確実性、有用性等について、いかなる保証も行いません。
                </li>
                <li className="mb-2">
                  会員が本サービスを利用することにより生じた損害について、当サロンは故意または重過失がある場合を除き、責任を負わないものとします。
                </li>
                <li className="mb-2">
                  施術による仕上がりには個人差があることを会員は了承するものとします。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第11条（サービス内容の変更等）</h2>
              <p className="mb-4">
                当サロンは、会員への事前の通知なく、本サービスの内容を変更、追加または廃止することがあり、会員はこれを承諾するものとします。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第12条（利用規約の変更）</h2>
              <p className="mb-4">
                当サロンは、必要と判断した場合には、会員に通知することなく本規約を変更することができるものとします。
                変更後の利用規約は、当サロンウェブサイトに掲載された時点から効力を生じるものとします。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第13条（退会）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  会員は、当サロンの定める手続きにより、いつでも退会することができます。
                </li>
                <li className="mb-2">
                  退会時に残存するポイントは、退会と同時に失効するものとします。
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">第14条（準拠法・管轄裁判所）</h2>
              <ol className="list-decimal pl-6 mb-4">
                <li className="mb-2">
                  本規約の解釈にあたっては、日本法を準拠法とします。
                </li>
                <li className="mb-2">
                  本サービスに関して紛争が生じた場合には、当サロンの所在地を管轄する裁判所を専属的合意管轄とします。
                </li>
              </ol>

              <div className="mt-12 pt-8 border-t border-gray-300">
                <p className="text-right text-gray-600">
                  制定日：2024年1月1日<br />
                  最終改定日：2024年1月1日
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