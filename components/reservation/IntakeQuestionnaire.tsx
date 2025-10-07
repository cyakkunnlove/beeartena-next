import {
  ALLERGY_OPTIONS,
  GOAL_OPTIONS,
  INFECTION_OPTIONS,
  MEDICATION_OPTIONS,
  MENTAL_STATE_OPTIONS,
  PREGNANCY_OPTIONS,
  SKIN_TROUBLE_OPTIONS,
} from '@/lib/constants/intakeQuestionnaire'
import type { ReservationIntakeForm } from '@/lib/types'

interface IntakeQuestionnaireProps {
  value: ReservationIntakeForm
  onChange: (value: ReservationIntakeForm) => void
}

const toggleWithNone = (current: string[], option: string): string[] => {
  if (option === 'none') {
    return current.includes('none') && current.length === 1 ? [] : ['none']
  }

  const withoutNone = current.filter((item) => item !== 'none')
  if (withoutNone.includes(option)) {
    return withoutNone.filter((item) => item !== option)
  }
  return [...withoutNone, option]
}

const toggleOption = (current: string[], option: string): string[] => {
  if (current.includes(option)) {
    return current.filter((item) => item !== option)
  }
  return [...current, option]
}

const IntakeQuestionnaire = ({ value, onChange }: IntakeQuestionnaireProps) => {
  const update = (updates: Partial<ReservationIntakeForm>) => {
    onChange({
      ...value,
      ...updates,
    })
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-gray-900">1️⃣ アレルギーについて <span className="text-sm font-normal text-amber-700 align-middle">（必須）</span></h3>
        <p className="text-sm text-gray-600 mt-1">当てはまるものにチェックしてください（複数選択可）</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ALLERGY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 rounded"
                checked={value.allergies.selections.includes(option.value)}
                onChange={() =>
                  update({
                    allergies: {
                      ...value.allergies,
                      selections: toggleWithNone(value.allergies.selections, option.value),
                    },
                  })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="過去にアレルギー反応が出た場合、原因や症状を教えてください"
          value={value.allergies.details}
          onChange={(event) =>
            update({
              allergies: {
                ...value.allergies,
                details: event.target.value,
              },
            })
          }
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">2️⃣ 皮膚トラブルについて <span className="text-sm font-normal text-amber-700 align-middle">（必須）</span></h3>
        <p className="text-sm text-gray-600 mt-1">当てはまるものにチェックしてください</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SKIN_TROUBLE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 rounded"
                checked={value.skinConcerns.selections.includes(option.value)}
                onChange={() =>
                  update({
                    skinConcerns: {
                      ...value.skinConcerns,
                      selections: toggleWithNone(value.skinConcerns.selections, option.value),
                    },
                  })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="皮膚科での治療歴や薬の使用がある場合はご記入ください"
          value={value.skinConcerns.details}
          onChange={(event) =>
            update({
              skinConcerns: {
                ...value.skinConcerns,
                details: event.target.value,
              },
            })
          }
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">3️⃣ 妊娠・授乳について <span className="text-sm font-normal text-amber-700 align-middle">（必須）</span></h3>
        <p className="text-sm text-gray-600 mt-1">該当するものを1つお選びください</p>
        <div className="mt-4 space-y-2">
          {PREGNANCY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="radio"
                name="pregnancyStatus"
                className="rounded"
                value={option.value}
                checked={value.pregnancyStatus === option.value}
                onChange={() => update({ pregnancyStatus: option.value as ReservationIntakeForm['pregnancyStatus'] })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          妊娠・授乳中は安全のため施術をお控えいただくことがあります。
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">4️⃣ 感染症リスクについて <span className="text-sm font-normal text-amber-700 align-middle">（必須）</span></h3>
        <p className="text-sm text-gray-600 mt-1">当てはまるものにチェックしてください（複数選択可）</p>
        <div className="mt-4 space-y-2">
          {INFECTION_OPTIONS.map((option) => (
            <div key={option.value} className="flex flex-col gap-2">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 rounded"
                  checked={value.infectionHistory.selections.includes(option.value)}
                  onChange={() =>
                    update({
                      infectionHistory: {
                        ...value.infectionHistory,
                        selections: toggleWithNone(value.infectionHistory.selections, option.value),
                        other:
                          option.value === 'other' && !value.infectionHistory.selections.includes('other')
                            ? ''
                            : value.infectionHistory.other,
                      },
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
              {option.value === 'other' && value.infectionHistory.selections.includes('other') && (
                <input
                  type="text"
                  className="ml-6 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="感染症名を記載してください"
                  value={value.infectionHistory.other}
                  onChange={(event) =>
                    update({
                      infectionHistory: {
                        ...value.infectionHistory,
                        other: event.target.value,
                      },
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          安全管理のため、内容は外部に公開されません。
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">5️⃣ 心理状態・精神面について <span className="text-sm font-normal text-gray-500 align-middle">（任意）</span></h3>
        <p className="text-sm text-gray-600 mt-1">最近のご自身の状態に近いものをお選びください</p>
        <div className="mt-4 space-y-2">
          {MENTAL_STATE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="radio"
                name="mentalState"
                className="rounded"
                value={option.value}
                checked={value.mentalState === option.value}
                onChange={() => update({ mentalState: option.value as ReservationIntakeForm['mentalState'] })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          施術中はリラックスが大切なため、無理のないタイミングでご相談ください。
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">6️⃣ ご希望のイメージと目的 <span className="text-sm font-normal text-gray-500 align-middle">（任意）</span></h3>
        <p className="text-sm text-gray-600 mt-1">当てはまるものにチェックしてください（複数選択可）</p>
        <div className="mt-4 space-y-2">
          {GOAL_OPTIONS.map((option) => (
            <div key={option.value} className="flex flex-col gap-2">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 rounded"
                  checked={value.goals.selections.includes(option.value)}
                  onChange={() =>
                    update({
                      goals: {
                        ...value.goals,
                        selections: toggleOption(value.goals.selections, option.value),
                        other:
                          option.value === 'other' && !value.goals.selections.includes('other')
                            ? ''
                            : value.goals.other,
                      },
                    })
                  }
                />
                <span>
                  {option.label}
                  {option.value === 'other' && '（自由記入）'}
                </span>
              </label>
              {option.value === 'other' && value.goals.selections.includes('other') && (
                <input
                  type="text"
                  className="ml-6 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="ご希望のイメージをご記入ください"
                  value={value.goals.other}
                  onChange={(event) =>
                    update({
                      goals: {
                        ...value.goals,
                        other: event.target.value,
                      },
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">服薬中の薬について <span className="text-sm font-normal text-amber-700 align-middle">（必須）</span></h3>
        <p className="text-sm text-gray-600 mt-1">当てはまるものにチェックしてください（複数選択可）</p>
        <div className="mt-4 space-y-2">
          {MEDICATION_OPTIONS.map((option) => (
            <div key={option.value} className="flex flex-col gap-2">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 rounded"
                  checked={value.medications.selections.includes(option.value)}
                  onChange={() =>
                    update({
                      medications: {
                        ...value.medications,
                        selections: toggleWithNone(value.medications.selections, option.value),
                        other:
                          option.value === 'other' && !value.medications.selections.includes('other')
                            ? ''
                            : value.medications.other,
                      },
                    })
                  }
                />
                <span>
                  {option.label}
                  {option.value === 'other' && '（自由記入）'}
                </span>
              </label>
              {option.value === 'other' && value.medications.selections.includes('other') && (
                <input
                  type="text"
                  className="ml-6 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="服用中のお薬を記載してください"
                  value={value.medications.other}
                  onChange={(event) =>
                    update({
                      medications: {
                        ...value.medications,
                        other: event.target.value,
                      },
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          お薬の種類によっては施術の可否に影響があるため、事前に共有をお願いします。
        </p>
      </section>
    </div>
  )
}

export default IntakeQuestionnaire
