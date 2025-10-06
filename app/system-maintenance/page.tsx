export default function SystemMaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4">
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">システムメンテナンス中</h1>
        <p className="mb-6 text-gray-600">
          現在システムメンテナンス中です。
          <br />
          しばらく経ってから再度アクセスしてください。
        </p>
        <p className="text-sm text-gray-500">
          ご不便をおかけして申し訳ございません。
        </p>
      </div>
    </div>
  )
}
