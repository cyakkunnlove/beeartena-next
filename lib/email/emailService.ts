import { getIntakeOptionLabel, MENTAL_STATE_LABEL_MAP, PREGNANCY_LABEL_MAP } from '@/lib/constants/intakeQuestionnaire'
import { Reservation } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

import { ResendEmailService } from './resendService'
import type { EmailService, EmailTemplate } from './types'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@beeartena.jp'
const DEFAULT_FROM = process.env.EMAIL_FROM || 'BEE ART ENA <no-reply@beeartena.com>'

function maskRecipients(to: string): string {
  return to
    .split(',')
    .map((address) => {
      const trimmed = address.trim()
      if (!trimmed) return trimmed
      const [local, domain] = trimmed.split('@')
      if (!domain) return 'redacted'
      const safeLocal = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local[0]}***${local[local.length - 1]}`
      return `${safeLocal}@${domain}`
    })
    .join(', ')
}

class MockEmailService implements EmailService {
  async sendEmail(template: EmailTemplate): Promise<void> {
    logger.info('Mock email dispatch', {
      to: maskRecipients(template.to),
      subject: template.subject,
      hasBody: Boolean(template.body?.length),
    })
  }

  async sendReservationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    await this.sendEmail(createReservationConfirmationTemplate(reservation, userEmail))
  }

  async sendReservationNotificationToAdmin(reservation: Reservation): Promise<void> {
    await this.sendEmail(createReservationNotificationTemplate(reservation))
  }

  async sendCancellationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    await this.sendEmail(createCancellationConfirmationTemplate(reservation, userEmail))
  }

  async sendCancellationNotificationToAdmin(reservation: Reservation): Promise<void> {
    await this.sendEmail(createCancellationNotificationTemplate(reservation))
  }

  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    await this.sendEmail(createVerificationEmailTemplate(email, verificationLink))
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${weekday})`
}

function formatPrice(price: number): string {
  return price.toLocaleString('ja-JP')
}

function formatSelectionList(values?: string[], otherText?: string): string {
  if (!values || values.length === 0) {
    return '未回答'
  }

  const formatted = values.map((value) => {
    if (value === 'none') {
      return '特にありません'
    }
    if (value === 'other') {
      return otherText && otherText.trim().length > 0
        ? `その他（${otherText.trim()}）`
        : 'その他（詳細未記入）'
    }
    return getIntakeOptionLabel(value)
  })

  return formatted.filter((item) => item.length > 0).join('、') || '未回答'
}

function formatIntakeSummary(reservation: Reservation): string {
  const form = reservation.intakeForm
  if (!form) {
    return '（回答なし）'
  }

  const sections: string[] = []

  const allergyBase = `・アレルギー：${formatSelectionList(form.allergies?.selections, form.allergies?.details)}`
  sections.push(allergyBase)
  if (form.allergies?.details && form.allergies.details.trim().length > 0) {
    sections.push(`   補足：${form.allergies.details.trim()}`)
  }

  const skinBase = `・皮膚トラブル：${formatSelectionList(form.skinConcerns?.selections, form.skinConcerns?.details)}`
  sections.push(skinBase)
  if (form.skinConcerns?.details && form.skinConcerns.details.trim().length > 0) {
    sections.push(`   補足：${form.skinConcerns.details.trim()}`)
  }

  sections.push(
    `・妊娠・授乳：${PREGNANCY_LABEL_MAP[form.pregnancyStatus] ?? '未回答'}`,
    `・感染症リスク：${formatSelectionList(form.infectionHistory?.selections, form.infectionHistory?.other)}`,
    `・心理状態：${MENTAL_STATE_LABEL_MAP[form.mentalState] ?? '未回答'}`,
    `・ご希望のイメージ：${formatSelectionList(form.goals?.selections, form.goals?.other)}`,
    `・服薬中のお薬：${formatSelectionList(form.medications?.selections, form.medications?.other)}`,
  )

  return sections.join('\n')
}

function createReservationConfirmationTemplate(
  reservation: Reservation,
  userEmail: string,
): EmailTemplate {
  return {
    to: userEmail,
    from: DEFAULT_FROM,
    subject: '【BEE ART ENA】ご予約確認のお知らせ',
    body: `
${reservation.customerName} 様

この度は、BEE ART ENAをご予約いただき、誠にありがとうございます。
以下の内容でご予約を承りました。

【ご予約内容】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 日時：${formatDate(reservation.date)} ${reservation.time}
■ メニュー：${reservation.serviceName}
■ 料金：${formatPrice(reservation.price)}円
■ 所要時間：約2時間30分
━━━━━━━━━━━━━━━━━━━━━━━━

【サロン情報】
BEE ART ENA
〒509-7203 岐阜県恵那市長島町正家1丁目1-25 カットハウス恵那
TEL: 090-5278-5221

【アクセス】
駐車場完備

【事前問診のご確認】
以下の内容でお伺いしております。追加・変更がある場合は、お早めにご連絡ください。
${formatIntakeSummary(reservation)}

【注意事項】
・施術当日は眉メイクはせずにお越しください
・コンタクトレンズを着用の方は、念のため眼鏡をお持ちください
・妊娠中、授乳中の方は事前にお申し出ください

【変更・キャンセルについて】
ご予約の変更・キャンセルは、予約日の3日前（72時間前）までにお電話にてご連絡ください。

【マイページ】
ご予約内容の確認・変更は以下のマイページからも可能です。
https://beeartena-next.vercel.app/mypage

ご不明な点がございましたら、お気軽にお問い合わせください。
当日お会いできることを楽しみにしております。

━━━━━━━━━━━━━━━━━━━━━━━━
BEE ART ENA
理容師による安心のタトゥーメイクサロン
Instagram: @beeartena
LINE: @174geemy
━━━━━━━━━━━━━━━━━━━━━━━━
`,
  }
}

function createReservationNotificationTemplate(reservation: Reservation): EmailTemplate {
  return {
    to: ADMIN_EMAIL,
    from: DEFAULT_FROM,
    subject: `【予約通知】${formatDate(reservation.date)} ${reservation.time} - ${reservation.customerName}様`,
    body: `
新規予約が入りました。

【予約詳細】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約ID：${reservation.id}
■ 日時：${formatDate(reservation.date)} ${reservation.time}
■ 顧客名：${reservation.customerName}
■ 電話番号：${reservation.customerPhone}
■ メールアドレス：${reservation.customerEmail}
■ メニュー：${reservation.serviceName}
■ 料金：${formatPrice(reservation.price)}円
■ 備考：${reservation.notes || 'なし'}
■ 問診回答：
${formatIntakeSummary(reservation)}
━━━━━━━━━━━━━━━━━━━━━━━━

【管理画面】
https://beeartena-next.vercel.app/admin/dashboard

以上、ご確認をお願いいたします。
`,
  }
}

function createCancellationConfirmationTemplate(
  reservation: Reservation,
  userEmail: string,
): EmailTemplate {
  return {
    to: userEmail,
    from: DEFAULT_FROM,
    subject: '【BEE ART ENA】ご予約キャンセルのお知らせ',
    body: `
${reservation.customerName} 様

ご予約のキャンセルを承りました。

【キャンセルされた予約】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 日時：${formatDate(reservation.date)} ${reservation.time}
■ メニュー：${reservation.serviceName}
━━━━━━━━━━━━━━━━━━━━━━━━

またのご利用を心よりお待ちしております。

━━━━━━━━━━━━━━━━━━━━━━━━
BEE ART ENA
理容師による安心のタトゥーメイクサロン
TEL: 090-5278-5221
Instagram: @beeartena
LINE: @174geemy
━━━━━━━━━━━━━━━━━━━━━━━━
`,
  }
}

function createCancellationNotificationTemplate(reservation: Reservation): EmailTemplate {
  return {
    to: ADMIN_EMAIL,
    from: DEFAULT_FROM,
    subject: `【キャンセル通知】${formatDate(reservation.date)} ${reservation.time} - ${reservation.customerName}様`,
    body: `
予約がキャンセルされました。

【キャンセル詳細】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約ID：${reservation.id}
■ 日時：${formatDate(reservation.date)} ${reservation.time}
■ 顧客名：${reservation.customerName}
■ メニュー：${reservation.serviceName}
■ キャンセル理由：${reservation.cancelReason || '理由なし'}
━━━━━━━━━━━━━━━━━━━━━━━━

【管理画面】
https://beeartena-next.vercel.app/admin/dashboard
`,
  }
}

function createVerificationEmailTemplate(email: string, verificationLink: string): EmailTemplate {
  return {
    to: email,
    from: DEFAULT_FROM,
    subject: '【BEE ART ENA】メールアドレスの確認',
    body: `
BEE ART ENAへの会員登録ありがとうございます。

以下のリンクをクリックして、メールアドレスの確認を完了してください。

【確認リンク】
${verificationLink}

※このリンクは24時間有効です。

リンクが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
${verificationLink}

━━━━━━━━━━━━━━━━━━━━━━━━
BEE ART ENA
理容師による安心のタトゥーメイクサロン
━━━━━━━━━━━━━━━━━━━━━━━━
`,
  }
}

export function createEmailService(): EmailService {
  if (process.env.RESEND_API_KEY) {
    try {
      return new ResendEmailService(process.env.RESEND_API_KEY)
    } catch (error) {
      logger.error('Failed to initialise ResendEmailService, falling back to mock', { error })
    }
  } else if (process.env.NODE_ENV === 'production') {
    logger.warn('RESEND_API_KEY is not configured in production; using mock email service')
  }

  return new MockEmailService()
}

export const emailService = createEmailService()
export type { EmailService, EmailTemplate } from './types'
