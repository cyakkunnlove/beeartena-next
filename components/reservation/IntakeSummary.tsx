import clsx from 'clsx'

import { getIntakeOptionLabel, MENTAL_STATE_LABEL_MAP, PREGNANCY_LABEL_MAP } from '@/lib/constants/intakeQuestionnaire'
import type { ReservationIntakeForm } from '@/lib/types'

interface IntakeSummaryProps {
  intakeForm?: ReservationIntakeForm | null
  className?: string
}

const sectionMeta = {
  allergies: { title: '1️⃣ アレルギーについて', required: true },
  skinConcerns: { title: '2️⃣ 皮膚トラブルについて', required: true },
  pregnancy: { title: '3️⃣ 妊娠・授乳について', required: true },
  infection: { title: '4️⃣ 感染症リスクについて', required: true },
  mental: { title: '5️⃣ 心理状態・精神面について', required: false },
  goals: { title: '6️⃣ ご希望のイメージと目的', required: false },
  medications: { title: '服薬中の薬について', required: true },
} as const

const formatSelections = (values: string[]): string[] => {
  if (!values || values.length === 0) {
    return []
  }
  if (values.includes('none')) {
    return ['特にありません']
  }
  return values.map((value) => getIntakeOptionLabel(value))
}

const formatOtherSelection = (
  values: string[],
  otherText?: string,
): string[] => {
  if (!values || values.length === 0) {
    return []
  }

  const selections = values
    .map((value) => {
      if (value === 'other') {
        return otherText && otherText.trim().length > 0
          ? `${getIntakeOptionLabel(value)}（${otherText.trim()}）`
          : `${getIntakeOptionLabel(value)}（詳細未記入）`
      }
      if (value === 'none') {
        return '特にありません'
      }
      return getIntakeOptionLabel(value)
    })
    .filter((text) => text.length > 0)

  return selections
}

const renderStatusIcon = (hasValue: boolean, required: boolean) => {
  if (hasValue) {
    return <span className="text-emerald-600 mr-2">✓</span>
  }
  return <span className={`mr-2 ${required ? 'text-red-500' : 'text-gray-400'}`}>–</span>
}

const renderValueLines = (values: string[], fallback: string) => {
  if (values.length === 0) return fallback
  return values.join('、')
}

const IntakeSummary = ({ intakeForm, className }: IntakeSummaryProps) => {
  if (!intakeForm) {
    return null
  }

  const sections = [
    {
      key: 'allergies',
      title: sectionMeta.allergies.title,
      required: sectionMeta.allergies.required,
      valueLines: formatSelections(intakeForm.allergies.selections),
      note:
        intakeForm.allergies.details.trim().length > 0
          ? `補足: ${intakeForm.allergies.details.trim()}`
          : undefined,
    },
    {
      key: 'skinConcerns',
      title: sectionMeta.skinConcerns.title,
      required: sectionMeta.skinConcerns.required,
      valueLines: formatSelections(intakeForm.skinConcerns.selections),
      note:
        intakeForm.skinConcerns.details.trim().length > 0
          ? `補足: ${intakeForm.skinConcerns.details.trim()}`
          : undefined,
    },
    {
      key: 'pregnancy',
      title: sectionMeta.pregnancy.title,
      required: sectionMeta.pregnancy.required,
      valueLines: intakeForm.pregnancyStatus ? [PREGNANCY_LABEL_MAP[intakeForm.pregnancyStatus] ?? intakeForm.pregnancyStatus] : [],
      helper: '妊娠・授乳中は安全のため施術をお控えいただくことがあります。',
    },
    {
      key: 'infection',
      title: sectionMeta.infection.title,
      required: sectionMeta.infection.required,
      valueLines: formatOtherSelection(intakeForm.infectionHistory.selections, intakeForm.infectionHistory.other),
      helper: '安全管理のため、内容は外部に公開されません。',
    },
    {
      key: 'mental',
      title: sectionMeta.mental.title,
      required: sectionMeta.mental.required,
      valueLines: intakeForm.mentalState ? [MENTAL_STATE_LABEL_MAP[intakeForm.mentalState] ?? intakeForm.mentalState] : [],
      helper: '施術中はリラックスが大切なため、無理のないタイミングでご相談ください。',
    },
    {
      key: 'goals',
      title: sectionMeta.goals.title,
      required: sectionMeta.goals.required,
      valueLines: formatOtherSelection(intakeForm.goals.selections, intakeForm.goals.other),
    },
    {
      key: 'medications',
      title: sectionMeta.medications.title,
      required: sectionMeta.medications.required,
      valueLines: formatOtherSelection(intakeForm.medications.selections, intakeForm.medications.other),
      helper: 'お薬の種類によっては施術の可否に影響する場合があります。',
    },
  ]

  return (
    <div className={clsx('bg-white rounded-lg p-4 shadow-sm border border-gray-100 space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">施術前問診の回答</h3>
        <p className="text-xs text-gray-500 mt-1">
          施術の安全管理のためにお伺いしている内容です。回答済みの項目には「✓」、未回答は「–」で表示されます。
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const hasValues = section.valueLines.length > 0
          const fallback = section.required ? '未回答（必須）' : '未回答（任意）'

          return (
            <div key={section.key} className="border border-gray-100 rounded-md p-3 bg-gray-50">
              <div className="flex items-start">
                {renderStatusIcon(hasValues, section.required)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    {section.title}
                    <span className={`text-xs ${section.required ? 'text-amber-700' : 'text-gray-500'}`}>
                      {section.required ? '必須' : '任意'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {renderValueLines(section.valueLines, fallback)}
                  </p>
                  {section.note && <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{section.note}</p>}
                  {section.helper && <p className="mt-2 text-xs text-gray-500">{section.helper}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default IntakeSummary
