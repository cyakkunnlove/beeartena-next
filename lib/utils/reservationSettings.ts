import type { BusinessHours, ReservationDateOverride, ReservationSettings } from '@/lib/types'

export const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 },
  { dayOfWeek: 1, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 2, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 4, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 5, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 6, open: '18:00', close: '20:00', isOpen: true, maxCapacityPerDay: 1 },
]

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

const timeToMinutes = (value: string): number | null => {
  if (!isValidTime(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  if (![hour, minute].every(Number.isFinite)) return null
  return hour * 60 + minute
}

const normalizeAllowedSlots = (value: unknown): string[] | undefined => {
  if (!value) {
    return undefined
  }

  const toArray = (input: unknown): string[] => {
    if (Array.isArray(input)) {
      return input
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((slot) => slot.length > 0 && isValidTime(slot))
    }

    if (typeof input === 'string') {
      return input
        .split(',')
        .map((slot) => slot.trim())
        .filter((slot) => slot.length > 0 && isValidTime(slot))
    }

    return []
  }

  const slots = toArray(value)
  return slots.length > 0 ? Array.from(new Set(slots)) : undefined
}

const normalizeAlternateSlotSets = (value: unknown): string[][] | undefined => {
  if (!value) {
    return undefined
  }

  const inputArray = Array.isArray(value) ? value : [value]

  const sets = inputArray
    .map((entry) => normalizeAllowedSlots(entry))
    .filter((set): set is string[] => Array.isArray(set) && set.length > 0)

  return sets.length > 0 ? sets : undefined
}

const normalizeDateOverrides = (
  overrides?: unknown,
): Record<string, ReservationDateOverride> => {
  if (!overrides || typeof overrides !== 'object') {
    return {}
  }

  const result: Record<string, ReservationDateOverride> = {}
  Object.entries(overrides as Record<string, unknown>).forEach(([date, config]) => {
    if (typeof date !== 'string' || date.trim().length === 0) {
      return
    }
    const allowedSlots = normalizeAllowedSlots(
      (config as { allowedSlots?: unknown })?.allowedSlots,
    )
    if (allowedSlots && allowedSlots.length > 0) {
      result[date] = { allowedSlots }
    }
  })

  return result
}

const DEFAULT_TEMPLATE: ReservationSettings = {
  slotDuration: 120,
  maxCapacityPerSlot: 1,
  businessHours: DEFAULT_BUSINESS_HOURS.map((hours) => ({ ...hours })),
  blockedDates: [],
  dateOverrides: {},
  cancellationDeadlineHours: 72,
  cancellationPolicy:
    '予約日の3日前（72時間前）までキャンセルが可能です。それ以降はお電話にてご連絡ください。',
}

export const cloneDefaultSettings = (): ReservationSettings => ({
  slotDuration: DEFAULT_TEMPLATE.slotDuration,
  maxCapacityPerSlot: DEFAULT_TEMPLATE.maxCapacityPerSlot,
  businessHours: DEFAULT_TEMPLATE.businessHours.map((hours) => ({ ...hours })),
  blockedDates: [...(DEFAULT_TEMPLATE.blockedDates ?? [])],
  dateOverrides: { ...(DEFAULT_TEMPLATE.dateOverrides ?? {}) },
  cancellationDeadlineHours: DEFAULT_TEMPLATE.cancellationDeadlineHours,
  cancellationPolicy: DEFAULT_TEMPLATE.cancellationPolicy,
})

export const normalizeBusinessHours = (hours?: unknown): BusinessHours[] => {
  const base = new Map<number, BusinessHours>(
    DEFAULT_BUSINESS_HOURS.map((entry) => [entry.dayOfWeek, { ...entry }]),
  )

  if (Array.isArray(hours)) {
    hours.forEach((raw) => {
      if (!raw || typeof raw !== 'object') {
        return
      }
      const source = raw as Record<string, unknown>
      const day = Number(source.dayOfWeek)
      if (!Number.isInteger(day)) {
        return
      }

      const current = base.get(day) ?? {
        dayOfWeek: day,
        open: '',
        close: '',
        isOpen: false,
        maxCapacityPerDay: 1,
        allowedSlots: undefined,
        alternateSlotSets: undefined,
      }

      const allowMultipleSlots = Boolean(source.allowMultipleSlots)
      const slotIntervalRaw = Number(source.slotInterval)
      const maxCapacityRaw = Number(source.maxCapacityPerDay)
      const normalizedAllowedSlots = normalizeAllowedSlots(source.allowedSlots)
      const alternateSlotSets = normalizeAlternateSlotSets(source.alternateSlotSets)

      const updated: BusinessHours = {
        dayOfWeek: day,
        open: typeof source.open === 'string' ? source.open : current.open,
        close: typeof source.close === 'string' ? source.close : current.close,
        isOpen: source.isOpen !== undefined ? Boolean(source.isOpen) : current.isOpen,
        allowMultipleSlots,
        maxCapacityPerDay: Number.isFinite(maxCapacityRaw)
          ? maxCapacityRaw
          : current.maxCapacityPerDay ?? 1,
      }

      const resolvedAllowedSlots = normalizedAllowedSlots ?? current.allowedSlots
      if (resolvedAllowedSlots && resolvedAllowedSlots.length > 0) {
        updated.allowedSlots = resolvedAllowedSlots
      }

      const resolvedAlternateSets = alternateSlotSets ?? current.alternateSlotSets
      if (resolvedAlternateSets && resolvedAlternateSets.length > 0) {
        updated.alternateSlotSets = resolvedAlternateSets
      }

      const slotInterval = allowMultipleSlots && Number.isFinite(slotIntervalRaw)
        ? slotIntervalRaw
        : current.slotInterval

      if (allowMultipleSlots && Number.isFinite(slotInterval ?? NaN)) {
        updated.slotInterval = slotInterval ?? 30
      }

      base.set(day, updated)
    })
  }

  return Array.from(base.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

export const normalizeSettings = (data?: Partial<ReservationSettings> | null): ReservationSettings => {
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
    dateOverrides: normalizeDateOverrides(data.dateOverrides),
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

export const sanitizeSettingsForWrite = (
  settings: ReservationSettings,
): ReservationSettings => {
  const businessHours = settings.businessHours.map((hours) => {
    const allowMultipleSlots = Boolean(hours.allowMultipleSlots)
    const normalized: BusinessHours = {
      dayOfWeek: hours.dayOfWeek,
      open: hours.open || '',
      close: hours.close || '',
      isOpen: Boolean(hours.isOpen),
      allowMultipleSlots,
      maxCapacityPerDay: Number.isFinite(hours.maxCapacityPerDay)
        ? Number(hours.maxCapacityPerDay)
        : 1,
    }

    const allowedSlots = Array.isArray(hours.allowedSlots)
      ? hours.allowedSlots.filter((slot) => isValidTime(slot))
      : undefined
    if (allowedSlots && allowedSlots.length > 0) {
      normalized.allowedSlots = Array.from(new Set(allowedSlots))
    }

    const alternateSlotSets = normalizeAlternateSlotSets(hours.alternateSlotSets)
    if (alternateSlotSets && alternateSlotSets.length > 0) {
      normalized.alternateSlotSets = alternateSlotSets
    }

    if (allowMultipleSlots) {
      const interval = Number(hours.slotInterval ?? 30)
      normalized.slotInterval = Number.isFinite(interval) && interval > 0 ? interval : 30
    }

    return normalized
  })

  const blockedDates = Array.isArray(settings.blockedDates)
    ? settings.blockedDates.filter((date): date is string => typeof date === 'string' && Boolean(date))
    : []

  const dateOverrides = normalizeDateOverrides(settings.dateOverrides)

  return {
    slotDuration: Number.isFinite(settings.slotDuration) ? settings.slotDuration : 120,
    maxCapacityPerSlot: Number.isFinite(settings.maxCapacityPerSlot)
      ? settings.maxCapacityPerSlot
      : 1,
    businessHours,
    blockedDates,
    dateOverrides,
    cancellationDeadlineHours: Number.isFinite(settings.cancellationDeadlineHours)
      ? settings.cancellationDeadlineHours
      : 72,
    cancellationPolicy:
      settings.cancellationPolicy?.trim() ||
      '予約日の3日前（72時間前）までキャンセルが可能です。それ以降はお電話にてご連絡ください。',
  }
}

export const validateReservationSettings = (
  settings: ReservationSettings,
): { ok: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!Number.isFinite(settings.slotDuration) || settings.slotDuration <= 0) {
    errors.push('予約枠の長さ（slotDuration）が不正です。')
  }

  if (!Number.isFinite(settings.maxCapacityPerSlot) || settings.maxCapacityPerSlot <= 0) {
    errors.push('1枠あたりの最大予約数（maxCapacityPerSlot）が不正です。')
  }

  const slotDuration = Number.isFinite(settings.slotDuration) ? settings.slotDuration : 0

  settings.businessHours.forEach((hours) => {
    if (!hours.isOpen) return

    const openMinutes = timeToMinutes(hours.open)
    const closeMinutes = timeToMinutes(hours.close)

    if (openMinutes === null || closeMinutes === null) {
      errors.push(`曜日(${hours.dayOfWeek})の開始/終了時刻が不正です。`)
      return
    }

    const totalMinutes = closeMinutes - openMinutes
    if (totalMinutes <= 0) {
      errors.push(`曜日(${hours.dayOfWeek})の終了時刻が開始時刻より前です。`)
      return
    }

    if (slotDuration > 0 && totalMinutes < slotDuration) {
      errors.push(
        `曜日(${hours.dayOfWeek})の営業時間(${hours.open}-${hours.close})が予約枠(${slotDuration}分)より短いです。`,
      )
    }

    if (hours.allowMultipleSlots) {
      const interval = Number(hours.slotInterval ?? 0)
      if (!Number.isFinite(interval) || interval <= 0) {
        errors.push(`曜日(${hours.dayOfWeek})のスロット間隔（slotInterval）が不正です。`)
      }
    }
  })

  return { ok: errors.length === 0, errors }
}
