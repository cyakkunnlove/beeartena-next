'use client'

import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import { Reservation } from '@/lib/types'
import ReservationDetailModal from '@/components/ReservationDetailModal'

export default function ReservationsPage() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string>('')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadReservations = useCallback(async () => {
    try {
      // APIから予約データを取得
      const token = localStorage.getItem('auth_token')

      const response = await fetch('/api/reservations', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Failed to fetch reservations: ${response.status}`)
      }

      const data = await response.json()

      // data.reservationsが存在し、配列であることを確認
      if (data.reservations && Array.isArray(data.reservations)) {
        setReservations(
          data.reservations.sort((a: Reservation, b: Reservation) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        )
      } else {
        console.error('Invalid response format:', data)
        setReservations([])
      }
    } catch (error) {
      console.error('Failed to load reservations:', error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadReservations()
    }
  }, [user, loadReservations])

  const filteredReservations = reservations.filter((reservation) => {
    const reservationDate = new Date(reservation.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (filter === 'upcoming') {
      return reservationDate >= today && reservation.status !== 'cancelled'
    } else if (filter === 'past') {
      return reservationDate < today || reservation.status === 'completed'
    }
    return true
  })

  const canCancelReservation = (reservation: Reservation): boolean => {
    // すでにキャンセル済みまたは完了済みの場合はキャンセル不可
    if (reservation.status === 'cancelled' || reservation.status === 'completed') {
      return false
    }

    // 予約日時の72時間（3日）前までキャンセル可能
    const reservationDate = new Date(`${reservation.date}T${reservation.time}`)
    const now = new Date()
    const hoursUntilReservation = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntilReservation >= 72
  }

  const handleCancel = async (reservation: Reservation) => {
    if (!canCancelReservation(reservation)) {
      setCancelError('予約の72時間前を過ぎているため、オンラインでのキャンセルはできません。お電話にてご相談ください。')
      setTimeout(() => setCancelError(''), 5000)
      return
    }

    setCancellingId(reservation.id)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ reason: 'お客様によるキャンセル' }),
      })

      if (!response.ok) {
        throw new Error('キャンセルに失敗しました')
      }

      // 予約リストを再読み込み
      await loadReservations()
      // モーダルを閉じる
      setIsModalOpen(false)
      setSelectedReservation(null)
    } catch (error) {
      console.error('キャンセルエラー:', error)
      setCancelError('キャンセルに失敗しました。もう一度お試しください。')
      setTimeout(() => setCancelError(''), 5000)
    } finally {
      setCancellingId(null)
    }
  }

  const openReservationDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">確定</span>
        )
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
            確認待ち
          </span>
        )
      case 'completed':
        return (
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">完了</span>
        )
      case 'cancelled':
        return (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">キャンセル</span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="loading-spinner mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">予約履歴</h1>

        {/* エラーメッセージ */}
        {cancelError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {cancelError}
          </div>
        )}

        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'upcoming' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今後の予約
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'past' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            過去の予約
          </button>
        </div>

        {/* 予約リスト */}
        {filteredReservations.length > 0 ? (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openReservationDetail(reservation)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{reservation.serviceName}</h3>
                    <p className="text-gray-600">
                      {new Date(reservation.date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}{' '}
                      {reservation.time}
                    </p>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">料金:</span>
                    <span className="ml-2 font-semibold">
                      ¥{reservation.price.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">予約番号:</span>
                    <span className="ml-2">{reservation.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {reservation.notes && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">備考:</span> {reservation.notes}
                  </div>
                )}

                {reservation.status === 'confirmed' && new Date(reservation.date) > new Date() && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      クリックして詳細を表示・キャンセル可能
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' ? '今後の予約はありません' : '予約履歴がありません'}
            </p>
            <a href="/reservation" className="btn btn-primary">
              新規予約をする
            </a>
          </div>
        )}
      </div>

      {/* 予約詳細モーダル */}
      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isModalOpen}
        onClose={closeModal}
        onCancel={handleCancel}
        canCancel={canCancelReservation}
        isCancelling={cancellingId === selectedReservation?.id}
      />
    </div>
  )
}
