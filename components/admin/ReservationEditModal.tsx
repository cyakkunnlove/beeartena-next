'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

import { reservationService } from '@/lib/reservationService'
import { Reservation } from '@/lib/types'

interface ReservationEditModalProps {
  reservation: Reservation | null
  onClose: () => void
  onUpdate: (reservation: Reservation) => void
}

export default function ReservationEditModal({
  reservation,
  onClose,
  onUpdate,
}: ReservationEditModalProps) {
  const [editedReservation, setEditedReservation] = useState<Reservation | null>(reservation)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  // Get available time slots when date changes
  const handleDateChange = async (date: string) => {
    if (!editedReservation) return

    setEditedReservation({
      ...editedReservation,
      date,
    })

    // Get available slots for the new date
    const slots = await reservationService.getTimeSlotsForDate(date)
    const available = slots
      .filter((slot) => slot.available || slot.time === reservation?.time)
      .map((slot) => slot.time)
    setAvailableSlots(available)
  }

  const handleSave = () => {
    if (!editedReservation) return

    onUpdate(editedReservation)
    onClose()
  }

  if (!reservation || !editedReservation) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-6">予約情報の編集</h2>

          <div className="space-y-4">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">お客様情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="customer-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    お名前
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={editedReservation.customerName}
                    onChange={(e) =>
                      setEditedReservation({
                        ...editedReservation,
                        customerName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="customer-phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    電話番号
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={editedReservation.customerPhone}
                    onChange={(e) =>
                      setEditedReservation({
                        ...editedReservation,
                        customerPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="customer-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={editedReservation.customerEmail}
                    onChange={(e) =>
                      setEditedReservation({
                        ...editedReservation,
                        customerEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Reservation Details */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">予約内容</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reservation-date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    日付
                  </label>
                  <input
                    id="reservation-date"
                    type="date"
                    value={editedReservation.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reservation-time"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    時間
                  </label>
                  <select
                    id="reservation-time"
                    value={editedReservation.time}
                    onChange={(e) =>
                      setEditedReservation({
                        ...editedReservation,
                        time: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value={editedReservation.time}>{editedReservation.time}</option>
                    {availableSlots
                      .filter((slot) => slot !== editedReservation.time)
                      .map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="service-type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    サービス
                  </label>
                  <select
                    id="service-type"
                    value={editedReservation.serviceType}
                    onChange={(e) => {
                      const serviceType = e.target.value as '2D' | '3D' | '4D'
                      const serviceMap = {
                        '2D': { name: 'パウダーブロウ', price: 22000 },
                        '3D': { name: 'フェザーブロウ', price: 23000 },
                        '4D': { name: 'パウダー&フェザー', price: 25000 },
                      }
                      const service = serviceMap[serviceType]

                      setEditedReservation({
                        ...editedReservation,
                        serviceType,
                        serviceName: service.name,
                        price: service.price,
                      })
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="2D">2D - パウダーブロウ</option>
                    <option value="3D">3D - フェザーブロウ</option>
                    <option value="4D">4D - パウダー&フェザー</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="reservation-status"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ステータス
                  </label>
                  <select
                    id="reservation-status"
                    value={editedReservation.status}
                    onChange={(e) =>
                      setEditedReservation({
                        ...editedReservation,
                        status: e.target.value as Reservation['status'],
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="pending">承認待ち</option>
                    <option value="confirmed">確定</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="reservation-notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                備考
              </label>
              <textarea
                id="reservation-notes"
                value={editedReservation.notes || ''}
                onChange={(e) =>
                  setEditedReservation({
                    ...editedReservation,
                    notes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              whileTap={{ scale: 0.95 }}
            >
              キャンセル
            </motion.button>
            <motion.button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
              whileTap={{ scale: 0.95 }}
            >
              保存
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
