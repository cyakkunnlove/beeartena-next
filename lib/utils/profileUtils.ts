import { User } from '@/lib/types'

/**
 * プロフィールの完成度をチェック
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false

  // 必須項目のチェック
  return !!(
    user.name &&
    user.email &&
    user.phone &&
    user.phone.trim() !== '' // 電話番号が空文字でないことを確認
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
  if (!user.birthday) missing.push('生年月日')

  return missing
}

/**
 * 誕生日ポイント付与に必要な情報が揃っているか
 */
export function canReceiveBirthdayPoints(user: User | null): boolean {
  return !!(user && user.birthday)
}