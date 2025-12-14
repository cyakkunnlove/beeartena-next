import { Points, PointTransaction } from '@/lib/types'

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  if (value && typeof value === 'object') {
    if ('currentPoints' in value) {
      return toNumber((value as Record<string, unknown>).currentPoints, fallback)
    }
    if ('points' in value) {
      return toNumber((value as Record<string, unknown>).points, fallback)
    }
  }
  return fallback
}

const toISOString = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
  }
  if (value && typeof value === 'object') {
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      try {
        return (value as { toDate: () => Date }).toDate().toISOString()
      } catch {
        return new Date().toISOString()
      }
    }
    if ('seconds' in value && typeof (value as { seconds: number }).seconds === 'number') {
      const seconds = (value as { seconds: number; nanoseconds?: number }).seconds
      const nanos = 'nanoseconds' in (value as any) ? (value as { nanoseconds?: number }).nanoseconds ?? 0 : 0
      return new Date(seconds * 1000 + nanos / 1_000_000).toISOString()
    }
  }
  return new Date().toISOString()
}

const allowedTypes: ReadonlyArray<PointTransaction['type']> = [
  'earned',
  'used',
  'manual',
  'expired',
  'adjusted',
  'redeemed',
]

export const normalizePointTransactions = (
  history: unknown[] = [],
  fallbackUserId?: string,
): PointTransaction[] => {
  return history
    .map((entry, index) => {
      if (!entry) {
        return {
          id: `tx-${index}`,
          userId: fallbackUserId ?? '',
          amount: 0,
          type: 'earned',
          createdAt: new Date().toISOString(),
        } satisfies PointTransaction
      }

      const record = entry as Record<string, unknown>
      const amount = toNumber(record.amount, 0)
      const rawType = record.type
      const normalizedType: PointTransaction['type'] = allowedTypes.includes(rawType as PointTransaction['type'])
        ? (rawType as PointTransaction['type'])
        : amount >= 0
          ? 'earned'
          : 'used'
      const balanceValue = 'balance' in record ? toNumber(record.balance) : undefined
      const createdAt = toISOString(record.createdAt)
      const identifier = record.id ?? record.referenceId ?? record.transactionId ?? `${record.userId ?? fallbackUserId ?? 'tx'}-${index}`

      return {
        ...record,
        id: String(identifier),
        userId: String(record.userId ?? fallbackUserId ?? ''),
        amount,
        balance: balanceValue,
        type: normalizedType,
        createdAt,
      } as PointTransaction
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
export const determineTier = (lifetimePoints: number): Points['tier'] => {
  if (lifetimePoints >= 100_000) return 'platinum'
  if (lifetimePoints >= 50_000) return 'gold'
  if (lifetimePoints >= 20_000) return 'silver'
  return 'bronze'
}

export const buildPointsSnapshot = (
  userId: string,
  balance: unknown,
  history: unknown[] = [],
): Points => {
  const normalizedHistory = normalizePointTransactions(history, userId)
  const firstBalance = normalizedHistory.find((tx) => typeof tx.balance === 'number')?.balance
  const currentPoints = Math.max(0, toNumber(balance, toNumber(firstBalance, 0)))
  const lifetimePoints = Math.max(
    0,
    normalizedHistory.reduce((total, tx) => (tx.amount > 0 ? total + tx.amount : total), 0),
  )

  return {
    userId,
    currentPoints,
    lifetimePoints,
    tier: determineTier(lifetimePoints),
  }
}
