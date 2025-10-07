import type { ReservationIntakeForm } from '@/lib/types'

export const createDefaultIntakeForm = (): ReservationIntakeForm => ({
  allergies: {
    selections: [],
    details: '',
  },
  skinConcerns: {
    selections: [],
    details: '',
  },
  pregnancyStatus: 'none',
  infectionHistory: {
    selections: [],
    other: '',
  },
  mentalState: 'stable',
  goals: {
    selections: [],
    other: '',
  },
  medications: {
    selections: [],
    other: '',
  },
})

const toUniqueStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const stringified = value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
    .filter((item) => item.length > 0)

  return Array.from(new Set(stringified))
}

const sanitizeNoneExclusive = (selections: string[]): string[] => {
  if (selections.includes('none')) {
    return ['none']
  }
  return selections
}

const allowedPregnancyStates: ReservationIntakeForm['pregnancyStatus'][] = [
  'none',
  'pregnant',
  'breastfeeding',
  'possible',
]

const allowedMentalStates: ReservationIntakeForm['mentalState'][] = [
  'stable',
  'slightly_tired',
  'stressed',
  'mood_changes',
]

export const normalizeIntakeForm = (
  input?: Partial<ReservationIntakeForm> | null,
): ReservationIntakeForm => {
  const defaults = createDefaultIntakeForm()
  if (!input) {
    return defaults
  }

  const allergiesSelections = sanitizeNoneExclusive(toUniqueStringArray(input.allergies?.selections))
  const skinSelections = sanitizeNoneExclusive(toUniqueStringArray(input.skinConcerns?.selections))

  const infectionSelections = sanitizeNoneExclusive(toUniqueStringArray(input.infectionHistory?.selections))
  const medicationsSelections = sanitizeNoneExclusive(toUniqueStringArray(input.medications?.selections))

  const goalsSelections = toUniqueStringArray(input.goals?.selections)
  const pregnancyStatus = allowedPregnancyStates.includes(input.pregnancyStatus as any)
    ? (input.pregnancyStatus as ReservationIntakeForm['pregnancyStatus'])
    : defaults.pregnancyStatus

  const mentalState = allowedMentalStates.includes(input.mentalState as any)
    ? (input.mentalState as ReservationIntakeForm['mentalState'])
    : defaults.mentalState

  return {
    allergies: {
      selections: allergiesSelections,
      details: input.allergies?.details?.trim() ?? '',
    },
    skinConcerns: {
      selections: skinSelections,
      details: input.skinConcerns?.details?.trim() ?? '',
    },
    pregnancyStatus,
    infectionHistory: {
      selections: infectionSelections,
      other: input.infectionHistory?.other?.trim() ?? '',
    },
    mentalState,
    goals: {
      selections: goalsSelections,
      other: input.goals?.other?.trim() ?? '',
    },
    medications: {
      selections: medicationsSelections,
      other: input.medications?.other?.trim() ?? '',
    },
  }
}
