import { NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import type { BusinessHours, ReservationSettings } from '@/lib/types'

const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 },
  { dayOfWeek: 1, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 2, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 4, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 5, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 6, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
]

const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOCUMENT = 'reservation-settings'

const DEFAULT_TEMPLATE: ReservationSettings = {
  slotDuration: 120,
  maxCapacityPerSlot: 1,
  businessHours: DEFAULT_BUSINESS_HOURS.map((hours) => ({ ...hours })),
  blockedDates: [],
  cancellationDeadlineHours: 24,
  cancellationPolicy:
    '予約日の24時間前までキャンセルが可能です。それ以降のキャンセルはお電話にてご連絡ください。',
}

const cloneDefaultSettings = (): ReservationSettings => ({
  slotDuration: DEFAULT_TEMPLATE.slotDuration,
  maxCapacityPerSlot: DEFAULT_TEMPLATE.maxCapacityPerSlot,
  businessHours: DEFAULT_TEMPLATE.businessHours.map((hours) => ({ ...hours })),
  blockedDates: [...(DEFAULT_TEMPLATE.blockedDates ?? [])],
  cancellationDeadlineHours: DEFAULT_TEMPLATE.cancellationDeadlineHours,
  cancellationPolicy: DEFAULT_TEMPLATE.cancellationPolicy,
})

function normalizeBusinessHours(hours?: unknown): BusinessHours[] {
  const base = new Map<number, BusinessHours>(
    DEFAULT_BUSINESS_HOURS.map((entry) => [entry.dayOfWeek, { ...entry }]),
  )

  if (Array.isArray(hours)) {
    hours.forEach((raw) => {
      if (!raw || typeof raw !== 'object') return
      const source = raw as Record<string, unknown>
      const day = Number(source.dayOfWeek)
      if (!Number.isInteger(day)) return

      const current = base.get(day) ?? {
        dayOfWeek: day,
        open: '',
        close: '',
        isOpen: false,
        maxCapacityPerDay: 1,
      }

      const allowMultipleSlots = Boolean(source.allowMultipleSlots)
      const slotIntervalRaw = Number(source.slotInterval)
      const maxCapacityRaw = Number(source.maxCapacityPerDay)

      base.set(day, {
        dayOfWeek: day,
        open: typeof source.open === 'string' ? source.open : current.open,
        close: typeof source.close === 'string' ? source.close : current.close,
        isOpen: source.isOpen !== undefined ? Boolean(source.isOpen) : current.isOpen,
        allowMultipleSlots,
        slotInterval:
          allowMultipleSlots && Number.isFinite(slotIntervalRaw) ? slotIntervalRaw : undefined,
        maxCapacityPerDay: Number.isFinite(maxCapacityRaw)
          ? maxCapacityRaw
          : current.maxCapacityPerDay ?? 1,
      })
    })
  }

  return Array.from(base.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

function normalizeSettings(data?: Partial<ReservationSettings> | null): ReservationSettings {
  if (!data) {
    return cloneDefaultSettings()
  }

  const slotDurationRaw = Number(data.slotDuration)
  const maxCapacityPerSlotRaw = Number(data.maxCapacityPerSlot)
  const cancellationDeadlineRaw = Number(data.cancellationDeadlineHours)

  return {
    slotDuration:
      Number.isFinite(slotDurationRaw) && slotDurationRaw > 0
        ? slotDurationRaw
        : DEFAULT_TEMPLATE.slotDuration,
    maxCapacityPerSlot:
      Number.isFinite(maxCapacityPerSlotRaw) && maxCapacityPerSlotRaw > 0
        ? maxCapacityPerSlotRaw
        : DEFAULT_TEMPLATE.maxCapacityPerSlot,
    businessHours: normalizeBusinessHours(data.businessHours),
    blockedDates: Array.isArray(data.blockedDates)
      ? data.blockedDates.filter(
          (date): date is string => typeof date === 'string' && date.trim().length > 0,
        )
      : [...(DEFAULT_TEMPLATE.blockedDates ?? [])],
    cancellationDeadlineHours:
      Number.isFinite(cancellationDeadlineRaw) && cancellationDeadlineRaw > 0
        ? cancellationDeadlineRaw
        : DEFAULT_TEMPLATE.cancellationDeadlineHours,
    cancellationPolicy:
      typeof data.cancellationPolicy === 'string' && data.cancellationPolicy.trim().length > 0
        ? data.cancellationPolicy.trim()
        : DEFAULT_TEMPLATE.cancellationPolicy,
  }
}

export async function GET() {
  try {
    const db = getAdminDb()

    if (!db) {
      return NextResponse.json({
        ...cloneDefaultSettings(),
        warning:
          'Firebase admin is not configured; default business hours are being returned.',
      })
    }

    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOCUMENT).get()

    if (!snapshot.exists) {
      return NextResponse.json(cloneDefaultSettings())
    }

    const settings = snapshot.data() as Partial<ReservationSettings> | undefined
    return NextResponse.json(normalizeSettings(settings ?? null))
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({
      ...cloneDefaultSettings(),
      warning: 'Failed to fetch settings from Firestore; default values are being returned.',
    })
  }
}
