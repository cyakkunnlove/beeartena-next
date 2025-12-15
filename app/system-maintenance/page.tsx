export default function SystemMaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-light-accent px-4">
      <div className="max-w-lg rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          システムメンテナンス中
        </h1>

        <div className="mb-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            現在、当WEBページは改修中のため、
            <br />
            <span className="font-semibold text-gray-900">予約の受付を停止しております。</span>
          </p>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-900">システム改修に伴い、既存のご予約データもリセットされております。</span>
              <br />
              大変お手数ですが、ご予約済みのお客様も改めてLINE公式アカウントよりご予約をお取り直しいただけますと幸いです。
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              ご予約は<span className="font-semibold text-primary">LINE公式アカウント</span>よりお願いいたします。
            </p>
            <a
              href="https://line.me/R/ti/p/@174geemy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#06C755] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#05b34b] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE公式アカウントで予約
            </a>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          ご不便をおかけして申し訳ございません。
          <br />
          しばらく経ってから再度アクセスしてください。
        </p>
      </div>
    </div>
  )
}
