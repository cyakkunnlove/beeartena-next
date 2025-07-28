'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import ReservationCalendar from '@/components/admin/ReservationCalendar'
import ReservationEditModal from '@/components/admin/ReservationEditModal'
import { useAuth } from '@/lib/auth/AuthContext'
import { reservationService } from '@/lib/reservationService'
import { storageService } from '@/lib/storage/storageService'
import { Reservation } from '@/lib/types'

export default function AdminReservations() {
  const router = useRouter()
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>(
    'all',
  )
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/')
      return
    }

    loadReservations()
  }, [user, router])

  const loadReservations = () => {
    const allReservations = storageService.getAllReservations()
    setReservations(
      allReservations.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    )
  }

  const handleStatusUpdate = (reservationId: string, newStatus: Reservation['status']) => {
    storageService.updateReservationStatus(reservationId, newStatus)
    loadReservations()
  }

  const handleReservationUpdate = (updatedReservation: Reservation) => {
    // Update the reservation in storage
    const allReservations = storageService.getAllReservations()
    const index = allReservations.findIndex((r) => r.id === updatedReservation.id)
    if (index !== -1) {
      allReservations[index] = {
        ...updatedReservation,
        updatedAt: new Date(),
      }
      localStorage.setItem('reservations', JSON.stringify(allReservations))
      loadReservations()
    }
  }

  const handleExportICal = () => {
    const icalContent = reservationService.exportToICal(reservations)
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `beeartena_reservations_${new Date().toISOString().split('T')[0]}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredReservations =
    filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'confirmed':
        return 'text-blue-600 bg-blue-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: Reservation['status']) => {
    switch (status) {
      case 'pending':
        return '承認待ち'
      case 'confirmed':
        return '確定'
      case 'completed':
        return '完了'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">予約管理</h1>
            <div className="flex gap-2">
              <button
                onClick={handleExportICal}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                📅 カレンダーエクスポート
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="text-primary hover:text-dark-gold"
              >
                ← 管理画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📅 カレンダー表示
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 リスト表示
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="flex gap-2">
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-3 py-1 rounded-lg font-medium text-sm transition-colors ${
                        filter === status
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? '全て' : getStatusText(status)}
                      {status !== 'all' && (
                        <span className="ml-1">
                          ({reservations.filter((r) => r.status === status).length})
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ReservationCalendar
              reservations={reservations}
              onEventClick={(reservation) => setSelectedReservation(reservation)}
              onDateClick={(_date) => {
                /* Date clicked */
              }}
            />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredReservations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">該当する予約がありません</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => (
                <div key={reservation.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">予約ID</p>
                      <p className="font-semibold">{reservation.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">お客様</p>
                      <p className="font-semibold">{reservation.customerName}</p>
                      <p className="text-sm text-gray-500">{reservation.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">サービス</p>
                      <p className="font-semibold">{reservation.serviceName}</p>
                      <p className="text-sm text-gray-500">¥{reservation.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">日時</p>
                      <p className="font-semibold">
                        {new Date(reservation.date).toLocaleDateString('ja-JP')} {reservation.time}
                      </p>
                    </div>
                  </div>

                  {reservation.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">備考</p>
                      <p className="text-sm">{reservation.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}
                    >
                      {getStatusText(reservation.status)}
                    </span>

                    <div className="flex gap-2">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'confirmed')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'completed')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                          >
                            完了
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditingReservation(reservation)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        ✏️ 編集
                      </button>
                      <a
                        href={`tel:${reservation.customerPhone}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        📞 電話
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reservation Detail Modal */}
        {selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">予約詳細</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">お客様</p>
                  <p className="font-semibold">{selectedReservation.customerName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">サービス</p>
                  <p className="font-semibold">{selectedReservation.serviceName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">日時</p>
                  <p className="font-semibold">
                    {new Date(selectedReservation.date).toLocaleDateString('ja-JP')}{' '}
                    {selectedReservation.time}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">ステータス</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReservation.status)}`}
                  >
                    {getStatusText(selectedReservation.status)}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600">連絡先</p>
                  <p>{selectedReservation.customerEmail}</p>
                  <p>{selectedReservation.customerPhone}</p>
                </div>

                {selectedReservation.notes && (
                  <div>
                    <p className="text-sm text-gray-600">備考</p>
                    <p>{selectedReservation.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                {selectedReservation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedReservation.id, 'confirmed')
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedReservation.id, 'cancelled')
                        setSelectedReservation(null)
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      キャンセル
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReservation && (
          <ReservationEditModal
            reservation={editingReservation}
            onClose={() => setEditingReservation(null)}
            onUpdate={handleReservationUpdate}
          />
        )}
      </div>
    </div>
  )
}
