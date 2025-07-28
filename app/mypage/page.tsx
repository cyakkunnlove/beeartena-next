'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'
import { storageService } from '@/lib/storage/storageService'
import { Points, Reservation } from '@/lib/types'

export default function MypageDashboard() {
  const { user } = useAuth()
  const [points, setPoints] = useState<Points | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const userPoints = storageService.getPoints(user!.id)
      setPoints(userPoints)

      const userReservations = storageService.getReservations(user!.id)
      setReservations(userReservations)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  const upcomingReservations = reservations
    .filter((r) => r.status === 'confirmed' && new Date(r.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'text-purple-600 bg-purple-100'
      case 'gold':
        return 'text-yellow-600 bg-yellow-100'
      case 'silver':
        return 'text-gray-600 bg-gray-200'
      default:
        return 'text-orange-600 bg-orange-100'
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
        <h1 className="text-2xl font-bold mb-4">ようこそ、{user?.name}さん</h1>
        <p className="text-gray-600">
          マイページへようこそ。ここから予約の確認やポイントの管理ができます。
        </p>
      </div>

      {/* ポイント情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">保有ポイント</h2>
          <div className="text-3xl font-bold text-primary mb-2">
            {points?.currentPoints || 0} pt
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">会員ランク:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(points?.tier || 'bronze')}`}
            >
              {points?.tier?.toUpperCase() || 'BRONZE'}
            </span>
          </div>
          <Link
            href="/mypage/points"
            className="text-primary hover:text-dark-gold text-sm mt-4 inline-block"
          >
            ポイント履歴を見る →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">累計獲得ポイント</h2>
          <div className="text-3xl font-bold text-secondary mb-2">
            {points?.lifetimePoints || 0} pt
          </div>
          <p className="text-sm text-gray-600">
            次のランクまで: {getNextTierPoints(points?.lifetimePoints || 0)} pt
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${getTierProgress(points?.lifetimePoints || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 次回予約 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">次回のご予約</h2>
        {upcomingReservations.length > 0 ? (
          <div className="space-y-4">
            {upcomingReservations.slice(0, 2).map((reservation) => (
              <div key={reservation.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{reservation.serviceName}</h3>
                    <p className="text-gray-600">
                      {new Date(reservation.date).toLocaleDateString('ja-JP')} {reservation.time}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    確定
                  </span>
                </div>
                <p className="text-sm text-gray-600">料金: ¥{reservation.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">予約はありません</p>
            <Link href="/reservation" className="btn btn-primary">
              予約する
            </Link>
          </div>
        )}
        <Link
          href="/mypage/reservations"
          className="text-primary hover:text-dark-gold text-sm mt-4 inline-block"
        >
          すべての予約を見る →
        </Link>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/reservation"
          className="bg-primary text-white rounded-xl p-6 text-center hover:bg-dark-gold transition-colors"
        >
          <div className="text-3xl mb-2">📅</div>
          <h3 className="font-semibold">新規予約</h3>
        </Link>
        <Link
          href="/mypage/profile"
          className="bg-secondary text-white rounded-xl p-6 text-center hover:bg-gray-700 transition-colors"
        >
          <div className="text-3xl mb-2">👤</div>
          <h3 className="font-semibold">プロフィール編集</h3>
        </Link>
        <a
          href="https://line.me/R/ti/p/@174geemy"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 text-white rounded-xl p-6 text-center hover:bg-green-700 transition-colors"
        >
          <div className="text-3xl mb-2">💬</div>
          <h3 className="font-semibold">LINE相談</h3>
        </a>
      </div>
    </div>
  )
}

function getNextTierPoints(lifetimePoints: number): number {
  if (lifetimePoints < 20000) return 20000 - lifetimePoints
  if (lifetimePoints < 50000) return 50000 - lifetimePoints
  if (lifetimePoints < 100000) return 100000 - lifetimePoints
  return 0
}

function getTierProgress(lifetimePoints: number): number {
  if (lifetimePoints < 20000) return (lifetimePoints / 20000) * 100
  if (lifetimePoints < 50000) return ((lifetimePoints - 20000) / 30000) * 100
  if (lifetimePoints < 100000) return ((lifetimePoints - 50000) / 50000) * 100
  return 100
}
