'use client'

import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/lib/auth/AuthContext'
import { apiClient } from '@/lib/api/client'
import { storageService } from '@/lib/storage/storageService'
import { buildPointsSnapshot, normalizePointTransactions } from '@/lib/utils/points'
import { Points, PointTransaction } from '@/lib/types'

export default function PointsPage() {
  const { user } = useAuth()
  const [points, setPoints] = useState<Points | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const loadPointsData = useCallback(async () => {
    if (!user) return

    setLoading(true)

    try {
      const response = await apiClient.getPoints()
      const historyValue = (response as Record<string, unknown> | undefined)?.history
      const rawHistory = Array.isArray(historyValue) ? historyValue : []
      const normalizedHistory = normalizePointTransactions(rawHistory, user.id)
      setTransactions(normalizedHistory)
      setPoints(buildPointsSnapshot(user.id, response?.balance, rawHistory))
    } catch (error) {
      console.error('Failed to fetch points via API:', error)
      const fallbackHistory = normalizePointTransactions(storageService.getPointTransactions(user.id), user.id)
      setTransactions(fallbackHistory)
      const fallbackPoints = storageService.getPoints(user.id)
      if (fallbackPoints) {
        setPoints(fallbackPoints)
      } else {
        setPoints(buildPointsSnapshot(user.id, fallbackHistory[0]?.balance ?? 0, fallbackHistory))
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadPointsData()
    }
  }, [user, loadPointsData])

  const getTierInfo = (tier: string) => {
    const tierData = {
      bronze: {
        name: 'ブロンズ',
        color: 'text-orange-600 bg-orange-100',
        next: 'シルバー',
        requirement: 20000,
      },
      silver: {
        name: 'シルバー',
        color: 'text-gray-600 bg-gray-200',
        next: 'ゴールド',
        requirement: 50000,
      },
      gold: {
        name: 'ゴールド',
        color: 'text-yellow-600 bg-yellow-100',
        next: 'プラチナ',
        requirement: 100000,
      },
      platinum: {
        name: 'プラチナ',
        color: 'text-purple-600 bg-purple-100',
        next: null,
        requirement: null,
      },
    }
    return tierData[tier as keyof typeof tierData] || tierData.bronze
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return '➕'
      case 'redeemed':
        return '➖'
      case 'expired':
        return '⏰'
      default:
        return '🔄'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="loading-spinner mx-auto"></div>
      </div>
    )
  }

  const tierInfo = getTierInfo(points?.tier || 'bronze')
  const remainingToNextTier = tierInfo.requirement
    ? Math.max(0, tierInfo.requirement - (points?.lifetimePoints || 0))
    : 0
  const nextTierProgress = tierInfo.requirement
    ? Math.min(100, ((points?.lifetimePoints || 0) / tierInfo.requirement) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* ポイント概要 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">ポイント情報</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">保有ポイント</p>
            <p className="text-4xl font-bold text-primary">{points?.currentPoints || 0}</p>
            <p className="text-sm text-gray-600">pt</p>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-2">累計獲得ポイント</p>
            <p className="text-4xl font-bold text-secondary">{points?.lifetimePoints || 0}</p>
            <p className="text-sm text-gray-600">pt</p>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-2">会員ランク</p>
            <div className={`inline-block px-4 py-2 rounded-full font-semibold ${tierInfo.color}`}>
              {tierInfo.name}
            </div>
          </div>
        </div>
      </div>

      {/* ランク情報 */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">会員ランク特典</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {['bronze', 'silver', 'gold', 'platinum'].map((tier) => {
            const info = getTierInfo(tier)
            const isCurrentTier = tier === (points?.tier || 'bronze')
            return (
              <div
                key={tier}
                className={`text-center p-4 rounded-lg ${
                  isCurrentTier ? 'bg-white shadow-md' : 'bg-white/50'
                }`}
              >
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${info.color}`}
                >
                  {info.name}
                </div>
                <p className="text-xs text-gray-600">
                  {tier === 'bronze'
                    ? '〜19,999pt'
                    : tier === 'silver'
                      ? '20,000pt〜'
                      : tier === 'gold'
                        ? '50,000pt〜'
                        : '100,000pt〜'}
                </p>
              </div>
            )
          })}
        </div>

        {tierInfo.next && tierInfo.requirement && (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              次のランクまで: {remainingToNextTier.toLocaleString()} pt
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${nextTierProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ポイント履歴 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">ポイント履歴</h2>

        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'earned' ? '+' : '-'}
                    {Math.abs(transaction.amount)} pt
                  </p>
                  <p className="text-sm text-gray-600">残高: {transaction.balance} pt</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 py-8">ポイント履歴がありません</p>
        )}
      </div>

      {/* ポイントの使い方 */}
      <div className="bg-light-accent rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">ポイントの使い方</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>1ポイント = 1円として、次回の施術料金のお支払いにご利用いただけます</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>ポイントは獲得日から1年間有効です</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>会員ランクが上がると、特別な特典がございます</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
