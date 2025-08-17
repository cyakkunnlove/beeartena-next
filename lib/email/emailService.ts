import { Reservation } from '@/lib/types'

export interface EmailTemplate {
  subject: string
  body: string
  to: string
  from?: string
}

// メールサービスのインターフェース
export interface EmailService {
  sendEmail(template: EmailTemplate): Promise<void>
  sendReservationConfirmation(reservation: Reservation, userEmail: string): Promise<void>
  sendReservationNotificationToAdmin(reservation: Reservation): Promise<void>
  sendCancellationConfirmation(reservation: Reservation, userEmail: string): Promise<void>
  sendCancellationNotificationToAdmin(reservation: Reservation): Promise<void>
  sendVerificationEmail(email: string, verificationLink: string): Promise<void>
}

// 開発環境用のモックサービス
class MockEmailService implements EmailService {
  async sendEmail(template: EmailTemplate): Promise<void> {
    console.log('📧 Mock Email Service - Sending email:')
    console.log('To:', template.to)
    console.log('Subject:', template.subject)
    console.log('Body:', template.body)
    console.log('---')
  }

  async sendReservationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    const template = createReservationConfirmationTemplate(reservation, userEmail)
    await this.sendEmail(template)
  }

  async sendReservationNotificationToAdmin(reservation: Reservation): Promise<void> {
    const template = createReservationNotificationTemplate(reservation)
    await this.sendEmail(template)
  }

  async sendCancellationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    const template = createCancellationConfirmationTemplate(reservation, userEmail)
    await this.sendEmail(template)
  }

  async sendCancellationNotificationToAdmin(reservation: Reservation): Promise<void> {
    const template = createCancellationNotificationTemplate(reservation)
    await this.sendEmail(template)
  }

  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    const template = createVerificationEmailTemplate(email, verificationLink)
    await this.sendEmail(template)
  }
}

// メールテンプレート作成関数
function createReservationConfirmationTemplate(reservation: Reservation, userEmail: string): EmailTemplate {
  return {
    to: userEmail,
    subject: `【BEE ART ENA】ご予約確認のお知らせ`,
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

【注意事項】
・施術当日は眉メイクはせずにお越しください
・コンタクトレンズを着用の方は、念のため眼鏡をお持ちください
・妊娠中、授乳中の方は事前にお申し出ください

【変更・キャンセルについて】
ご予約の変更・キャンセルは、前日までにお電話にてご連絡ください。

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
`
  }
}

function createReservationNotificationTemplate(reservation: Reservation): EmailTemplate {
  return {
    to: 'info@beeartena.jp', // 管理者メールアドレス
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
━━━━━━━━━━━━━━━━━━━━━━━━

【管理画面】
https://beeartena-next.vercel.app/admin/dashboard

以上、ご確認をお願いいたします。
`
  }
}

function createCancellationConfirmationTemplate(reservation: Reservation, userEmail: string): EmailTemplate {
  return {
    to: userEmail,
    subject: `【BEE ART ENA】ご予約キャンセルのお知らせ`,
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
`
  }
}

function createCancellationNotificationTemplate(reservation: Reservation): EmailTemplate {
  return {
    to: 'info@beeartena.jp',
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
`
  }
}

function createVerificationEmailTemplate(email: string, verificationLink: string): EmailTemplate {
  return {
    to: email,
    subject: `【BEE ART ENA】メールアドレスの確認`,
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
`
  }
}

// ヘルパー関数
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${year}年${month}月${day}日(${weekday})`
}

function formatPrice(price: number): string {
  return price.toLocaleString()
}

// 環境に応じてサービスを切り替え
export function createEmailService(): EmailService {
  // Resend APIキーが設定されている場合はResendサービスを使用
  if (process.env.RESEND_API_KEY) {
    const { ResendEmailService } = require('./resendService')
    return new ResendEmailService(process.env.RESEND_API_KEY)
  }
  
  // 本番環境では実際のメールサービス（SendGrid、AWS SES等）を使用
  if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
    // TODO: SendGridサービスの実装
    return new MockEmailService()
  }
  
  // 開発環境ではモックサービスを使用
  return new MockEmailService()
}

export const emailService = createEmailService()