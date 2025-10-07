export type IntakeOption = {
  value: string
  label: string
  description?: string
}

export const ALLERGY_OPTIONS: IntakeOption[] = [
  { value: 'metal', label: '金属アレルギー' },
  { value: 'cosmetics', label: '化粧品やスキンケア製品でかぶれたことがある' },
  { value: 'anesthesia', label: '麻酔や薬でアレルギー反応が出たことがある' },
  { value: 'food', label: '食べ物アレルギーがある' },
  { value: 'none', label: '特にない' },
]

export const SKIN_TROUBLE_OPTIONS: IntakeOption[] = [
  { value: 'keloid', label: 'ケロイド（盛り上がる傷あと）ができやすい' },
  { value: 'atopic', label: 'アトピー性皮膚炎がある' },
  { value: 'inflammation', label: 'ニキビ・湿疹など炎症がある部位に施術希望' },
  { value: 'none', label: '特にない' },
]

export const PREGNANCY_OPTIONS: IntakeOption[] = [
  { value: 'none', label: '該当しない' },
  { value: 'pregnant', label: '妊娠中' },
  { value: 'breastfeeding', label: '授乳中' },
  { value: 'possible', label: '妊娠の可能性がある' },
]

export const INFECTION_OPTIONS: IntakeOption[] = [
  { value: 'hepatitis_b', label: 'B型肝炎' },
  { value: 'hepatitis_c', label: 'C型肝炎' },
  { value: 'hiv', label: 'HIV' },
  { value: 'other', label: 'その他の感染症' },
  { value: 'none', label: 'なし' },
]

export const MENTAL_STATE_OPTIONS: IntakeOption[] = [
  { value: 'stable', label: '仕事や生活に安定感があり、穏やかに過ごせている' },
  { value: 'slightly_tired', label: '少し疲れやすいが、気分は安定している' },
  { value: 'stressed', label: '気分の浮き沈みがあり、ストレスを感じやすい' },
  { value: 'mood_changes', label: '最近、眠れない・落ち込みやすいなど気分の変化を感じる' },
]

export const GOAL_OPTIONS: IntakeOption[] = [
  { value: 'natural', label: '自然な仕上がりで毎朝のメイクを楽にしたい' },
  { value: 'impact', label: 'しっかりとしたデザインで印象を変えたい' },
  { value: 'confidence', label: '自信を持ちたい／コンプレックスをカバーしたい' },
  { value: 'other', label: 'その他' },
]

export const MEDICATION_OPTIONS: IntakeOption[] = [
  { value: 'none', label: '特に服用していない' },
  { value: 'steroid', label: 'ステロイド（塗り薬・飲み薬を含む）' },
  { value: 'immunosuppressant', label: '免疫抑制剤（例：ネオーラル、タクロリムスなど）' },
  { value: 'anticancer', label: '抗がん剤治療中または治療後まもない' },
  { value: 'anticoagulant', label: '抗血小板薬・抗凝固薬（バイアスピリン、ワーファリンなど）' },
  { value: 'other', label: 'その他' },
]

export const MENTAL_STATE_LABEL_MAP = Object.fromEntries(
  MENTAL_STATE_OPTIONS.map((option) => [option.value, option.label]),
)

export const PREGNANCY_LABEL_MAP = Object.fromEntries(
  PREGNANCY_OPTIONS.map((option) => [option.value, option.label]),
)

const optionMap = new Map<string, string>([
  ...ALLERGY_OPTIONS.map((option) => [option.value, option.label] as const),
  ...SKIN_TROUBLE_OPTIONS.map((option) => [option.value, option.label] as const),
  ...INFECTION_OPTIONS.map((option) => [option.value, option.label] as const),
  ...GOAL_OPTIONS.map((option) => [option.value, option.label] as const),
  ...MEDICATION_OPTIONS.map((option) => [option.value, option.label] as const),
])

export const getIntakeOptionLabel = (value: string): string => {
  return optionMap.get(value) ?? value
}
