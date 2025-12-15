'use client'

import { useEffect, useMemo, useState } from 'react'

import { apiClient } from '@/lib/api/client'

type AuditLogRow = {
  id: string
  createdAt?: { toDate?: () => Date } | string | Date
  actorUserId?: string
  actorEmail?: string
  actorRole?: string
  method?: string
  path?: string
  ip?: string
  userAgent?: string
  requestId?: string
  vercelEnv?: string
}

const toDateString = (value: AuditLogRow['createdAt']) => {
  if (!value) return ''
  try {
    if (value instanceof Date) return value.toLocaleString()
    if (typeof value === 'string') return new Date(value).toLocaleString()
    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate().toLocaleString()
    }
  } catch {
    // ignore
  }
  return ''
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)

  const fetchLogs = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await apiClient.getAdminAuditLogs({ limit })
      setLogs(response.logs as AuditLogRow[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '監査ログの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const rows = useMemo(() => logs ?? [], [logs])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">監査ログ</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理者APIへのアクセス履歴（最小監査）です。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value={50}>最新50件</option>
            <option value={100}>最新100件</option>
            <option value={200}>最新200件</option>
          </select>
          <button
            onClick={() => void fetchLogs()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            再読込
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">日時</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">管理者</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">メソッド</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">パス</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">IP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">環境</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={6}>
                  読み込み中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={6}>
                  ログがありません。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{toDateString(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {row.actorEmail || row.actorUserId || '-'}
                    </div>
                    <div className="text-xs text-gray-500">{row.actorRole || ''}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.method || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-800">{row.path || '-'}</div>
                    {row.requestId && (
                      <div className="mt-1 text-xs text-gray-500">req: {row.requestId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.ip || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.vercelEnv || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

