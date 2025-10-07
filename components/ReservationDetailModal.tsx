'use client'

import IntakeSummary from '@/components/reservation/IntakeSummary'
import { getMaintenanceOptionById, MAINTENANCE_OPTIONS } from '@/lib/constants/maintenanceOptions'
import { Reservation } from '@/lib/types'
import { X } from 'lucide-react'

interface ReservationDetailModalProps {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onCancel: (reservation: Reservation) => void
  canCancel: (reservation: Reservation) => boolean
  isCancelling: boolean
}

export default function ReservationDetailModal({
  reservation,
  isOpen,
  onClose,
  onCancel,
  canCancel,
  isCancelling,
}: ReservationDetailModalProps) {
  if (!isOpen || !reservation) return null

  const maintenanceOptionDetails = (reservation.maintenanceOptions ?? []).map((optionId) => {
    const detail = getMaintenanceOptionById(optionId)
    if (detail) return { id: optionId, name: detail.name }
    return { id: optionId, name: optionId }
  })

  const isFullMaintenanceSelection =
    maintenanceOptionDetails.length === MAINTENANCE_OPTIONS.length &&
    (reservation.maintenancePrice ?? 0) > 0

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '確定'
      case 'pending':
        return '確認待ち'
      case 'completed':
        return '完了'
      case 'cancelled':
        return 'キャンセル済み'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'completed':
        return 'text-blue-600 bg-blue-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  // 最終価格を計算（ポイント使用がある場合）
  const finalPrice = reservation.finalPrice || reservation.price

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">予約詳細</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* ステータス */}
          <div className="text-center">
            <span
              className={`inline-block px-4 py-2 rounded-full font-semibold ${getStatusColor(
                reservation.status
              )}`}
            >
              {getStatusLabel(reservation.status)}
            </span>
          </div>

          {/* 基本情報 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg mb-3">予約情報</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-600 text-sm">予約番号</span>
                <p className="font-mono font-semibold">{reservation.id.slice(0, 8).toUpperCase()}</p>
              </div>

              <div>
                <span className="text-gray-600 text-sm">サービス種別</span>
                <p className="font-semibold">{reservation.serviceType}</p>
              </div>

              <div>
                <span className="text-gray-600 text-sm">サービス名</span>
                <p className="font-semibold">{reservation.serviceName}</p>
              </div>

              <div>
                <span className="text-gray-600 text-sm">日時</span>
                <p className="font-semibold">
                  {new Date(reservation.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </p>
                <p className="font-semibold text-primary">{reservation.time}</p>
              </div>
            </div>
          </div>

          {/* 料金情報 */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg mb-3">料金情報</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">基本料金（{reservation.serviceName}）</span>
                <span className="font-semibold">¥{reservation.price.toLocaleString()}</span>
              </div>

              {/* メンテナンスオプション料金の詳細表示 */}
              {maintenanceOptionDetails.length > 0 && (
                <>
                  <div className="mt-2 mb-1 text-sm font-semibold text-gray-700">メンテナンスオプション：</div>
                  {maintenanceOptionDetails.map((option) => (
                    <div key={option.id} className="flex justify-between pl-4 text-sm">
                      <span className="text-gray-600">・{option.name}</span>
                    </div>
                  ))}
                  {reservation.maintenancePrice && reservation.maintenancePrice > 0 && (
                    <div className="flex justify-between pl-4">
                      <span className="text-gray-600">メンテナンス料金</span>
                      <span className="font-semibold">+¥{reservation.maintenancePrice.toLocaleString()}</span>
                    </div>
                  )}
                  {isFullMaintenanceSelection && (
                    <p className="pl-4 text-xs text-green-600">フルセット割引が適用されています。</p>
                  )}
                </>
              )}

              {/* 合計金額（基本料金＋メンテナンス料金） */}
              {reservation.totalPrice && reservation.totalPrice !== reservation.price && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-semibold">小計</span>
                  <span className="font-semibold">¥{reservation.totalPrice.toLocaleString()}</span>
                </div>
              )}

              {reservation.pointsUsed && reservation.pointsUsed > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>ポイント利用</span>
                  <span>-¥{reservation.pointsUsed.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>お支払い金額</span>
                <span className="text-primary">¥{finalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* お客様情報 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg mb-3">お客様情報</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-600 text-sm">お名前</span>
                <p className="font-semibold">{reservation.customerName}</p>
              </div>

              <div>
                <span className="text-gray-600 text-sm">電話番号</span>
                <p className="font-semibold">{reservation.customerPhone}</p>
              </div>

              <div className="md:col-span-2">
                <span className="text-gray-600 text-sm">メールアドレス</span>
                <p className="font-semibold">{reservation.customerEmail}</p>
              </div>
            </div>
          </div>

          {/* 問診票 */}
          {reservation.intakeForm && <IntakeSummary intakeForm={reservation.intakeForm} />}

          {/* 備考 */}
          {reservation.notes && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">備考・ご要望</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reservation.notes}</p>
            </div>
          )}

          {/* ポイント獲得情報 */}
          {reservation.status === 'completed' && (
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-green-700">
                ✨ この施術で <span className="font-bold text-lg">{Math.floor(reservation.price * 0.05)}</span> ポイント獲得しました
              </p>
            </div>
          )}

          {/* アクションボタン */}
          {reservation.status === 'confirmed' && new Date(reservation.date) > new Date() && (
            <div className="border-t pt-4 flex gap-3 justify-end">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={onClose}
              >
                閉じる
              </button>

              {canCancel(reservation) ? (
                <button
                  onClick={() => {
                    if (confirm('予約をキャンセルしてもよろしいですか？\n\nこの操作は取り消せません。')) {
                      onCancel(reservation)
                    }
                  }}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isCancelling ? 'キャンセル中...' : '予約をキャンセル'}
                </button>
              ) : (
                <div className="text-sm text-gray-500">
                  ※ キャンセル期限（72時間前）を過ぎています
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
