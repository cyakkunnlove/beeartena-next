import IntakeSummary from '@/components/reservation/IntakeSummary'
import { FULL_SET_PRICE, MAINTENANCE_OPTIONS, getMaintenanceOptionById } from '@/lib/constants/maintenanceOptions'
import type { ReservationIntakeForm, ServicePlan } from '@/lib/types'

interface ReservationSummaryProps {
  selectedPlan: ServicePlan | undefined
  selectedDate: string
  selectedTime: string
  isMonitorSelected: boolean
  formData: {
    name: string
    email: string
    phone: string
    notes: string
    intakeForm: ReservationIntakeForm
  }
  maintenanceOptions: string[]
  maintenancePrice: number
  baseServicePrice: number
  onBack: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

const formatYen = (value: number) => `¥${value.toLocaleString('ja-JP')}`

const formatDateLabel = (date: string) => {
  if (!date) return '未選択'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  } catch {
    return date
  }
}

export default function ReservationSummary({
  selectedPlan,
  selectedDate,
  selectedTime,
  isMonitorSelected,
  formData,
  maintenanceOptions,
  maintenancePrice,
  baseServicePrice,
  onBack,
  onConfirm,
  isSubmitting,
}: ReservationSummaryProps) {
  const maintenanceDetails = maintenanceOptions
    .map((id) => getMaintenanceOptionById(id))
    .filter((option): option is NonNullable<ReturnType<typeof getMaintenanceOptionById>> => Boolean(option))

  const monitorNotes = isMonitorSelected ? 'モニター適用（写真撮影にご協力をお願いします）' : '通常価格'
  const totalPrice = baseServicePrice + maintenancePrice
  const finalPrice = totalPrice
  const isFullMaintenance = maintenanceOptions.length === MAINTENANCE_OPTIONS.length && maintenancePrice === FULL_SET_PRICE

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">予約内容のご確認</h3>
        <p className="text-sm text-gray-600 mt-1">
          以下の内容でご予約を確定します。内容に変更がある場合は「内容を修正する」より戻って修正してください。
        </p>

        <div className="mt-4 space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900">ご予約日時</p>
            <p className="mt-1">
              {formatDateLabel(selectedDate)} / {selectedTime || '時間未選択'}
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">メニュー</p>
            <p className="mt-1">{selectedPlan ? selectedPlan.name : '未選択'}</p>
            {selectedPlan?.campaignPrice != null ? (
              <p className="text-xs text-gray-500">
                <span className="line-through">通常: {formatYen(selectedPlan.price)}</span>
                {' → '}1回目: {formatYen(selectedPlan.campaignPrice)}
                {selectedPlan.secondPrice != null && ` / 2回目: ${formatYen(selectedPlan.secondPrice)}`}
              </p>
            ) : null}
            {selectedPlan?.monitorEnabled && selectedPlan?.monitorPrice != null ? (
              <p className="text-xs text-amber-600">📷 モニター: {formatYen(selectedPlan.monitorPrice)}</p>
            ) : null}
            {monitorNotes ? <p className="text-xs text-gray-500 mt-1">{monitorNotes}</p> : null}
          </div>

          <div>
            <p className="font-semibold text-gray-900">料金内訳</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>メインメニュー</span>
                <span>{formatYen(baseServicePrice)}</span>
              </div>
              {maintenancePrice > 0 ? (
                maintenanceDetails.length > 0 ? (
                  <div>
                    <div className="flex justify-between">
                      <span>メンテナンスメニュー</span>
                      <span>{formatYen(maintenancePrice)}</span>
                    </div>
                    <ul className="ml-4 mt-1 list-disc text-xs text-gray-500">
                      {maintenanceDetails.map((option) => (
                        <li key={option.id}>{option.name}</li>
                      ))}
                    </ul>
                    {isFullMaintenance && (
                      <p className="mt-1 text-xs text-green-600 text-right">フルセット割引（¥500 OFF）適用</p>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>メンテナンスメニュー</span>
                    <span>{formatYen(maintenancePrice)}</span>
                  </div>
                )
              ) : (
                <div className="flex justify-between">
                  <span>メンテナンスメニュー</span>
                  <span>追加なし</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-dashed font-semibold text-base text-gray-900">
                <span>お支払い予定金額</span>
                <span className="text-primary">{formatYen(finalPrice)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900">お客様情報</p>
            <ul className="mt-2 space-y-1">
              <li>お名前：{formData.name || '未入力'}</li>
              <li>メール：{formData.email || '未入力'}</li>
              <li>電話番号：{formData.phone || '未入力'}</li>
              {formData.notes && <li>備考：{formData.notes}</li>}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">施術前問診の回答</p>
            <IntakeSummary intakeForm={formData.intakeForm} className="border border-gray-100" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          内容を修正する
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '送信中…' : 'この内容で予約を確定'}
        </button>
      </div>
    </div>
  )
}
