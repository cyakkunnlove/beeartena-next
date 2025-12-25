import { User } from '@/lib/types'

/**
 * プロフィールの完成度をチェック
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false

  const address =
    typeof user.address === 'string'
      ? { street: user.address }
      : user.address ?? {}

  const postalCode =
    typeof user.postalCode === 'string'
      ? user.postalCode
      : typeof (address as { postalCode?: unknown }).postalCode === 'string'
        ? String((address as { postalCode?: unknown }).postalCode)
        : ''
  const prefecture =
    typeof user.prefecture === 'string'
      ? user.prefecture
      : typeof (address as { prefecture?: unknown }).prefecture === 'string'
        ? String((address as { prefecture?: unknown }).prefecture)
        : ''
  const city =
    typeof user.city === 'string'
      ? user.city
      : typeof (address as { city?: unknown }).city === 'string'
        ? String((address as { city?: unknown }).city)
        : ''
  const street =
    typeof user.street === 'string'
      ? user.street
      : typeof (address as { street?: unknown }).street === 'string'
        ? String((address as { street?: unknown }).street)
        : ''

  // 必須項目のチェック
  return !!(
    user.name &&
    user.email &&
    user.phone &&
    user.phone.trim() !== '' && // 電話番号が空文字でないことを確認
    user.termsAcceptedAt && // 利用規約の同意が必要
    user.gender &&
    postalCode.trim() !== '' &&
    prefecture.trim() !== '' &&
    city.trim() !== '' &&
    street.trim() !== ''
  )
}

/**
 * プロフィールの不足情報を取得
 */
export function getMissingProfileFields(user: User | null): string[] {
  if (!user) return ['全ての情報']

  const missing: string[] = []

  if (!user.name || user.name.trim() === '') missing.push('名前')
  if (!user.email || user.email.trim() === '') missing.push('メールアドレス')
  if (!user.phone || user.phone.trim() === '') missing.push('電話番号')
  if (!(user.birthDate || user.birthday)) missing.push('生年月日')

  return missing
}

/**
 * 誕生日ポイント付与に必要な情報が揃っているか
 */
export function canReceiveBirthdayPoints(user: User | null): boolean {
  return !!(user && (user.birthDate || user.birthday))
}
