import { Resend } from 'resend'
import { EmailService, EmailTemplate } from './emailService'
import { Reservation } from '@/lib/types'

export class ResendEmailService implements EmailService {
  private resend: Resend

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      // toアドレスをカンマ区切りで配列に変換
      const recipients = template.to.includes(',') 
        ? template.to.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : [template.to]

      const { data, error } = await this.resend.emails.send({
        from: template.from || 'BEE ART ENA <onboarding@resend.dev>',
        to: recipients,
        subject: template.subject,
        html: this.convertToHtml(template.body),
        text: template.body,
      })

      if (error) {
        console.error('Resend error:', error)
        throw new Error(`メール送信に失敗しました: ${error.message}`)
      }

      console.log('Email sent successfully:', data)
    } catch (error) {
      console.error('Email sending failed:', error)
      throw error
    }
  }

  async sendReservationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    const template = this.createReservationConfirmationTemplate(reservation, userEmail)
    await this.sendEmail(template)
  }

  async sendReservationNotificationToAdmin(reservation: Reservation): Promise<void> {
    const template = this.createReservationNotificationTemplate(reservation)
    await this.sendEmail(template)
  }

  async sendCancellationConfirmation(reservation: Reservation, userEmail: string): Promise<void> {
    const template = this.createCancellationConfirmationTemplate(reservation, userEmail)
    await this.sendEmail(template)
  }

  async sendCancellationNotificationToAdmin(reservation: Reservation): Promise<void> {
    const template = this.createCancellationNotificationTemplate(reservation)
    await this.sendEmail(template)
  }

  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    const template = this.createVerificationEmailTemplate(email, verificationLink)
    await this.sendEmail(template)
  }

  private convertToHtml(text: string): string {
    // テキストをHTMLに変換（改行をbrタグに、URLをリンクに）
    return text
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
      .replace(/━+/g, '<hr style="border: 1px solid #ccc; margin: 20px 0;">')
      .replace(/【(.+?)】/g, '<strong>【$1】</strong>')
      .replace(/■/g, '▪️')
  }

  private createReservationConfirmationTemplate(reservation: Reservation, userEmail: string): EmailTemplate {
    const maintenanceOptionsText = this.formatMaintenanceOptions(reservation.maintenanceOptions)
    const priceDetailsText = this.formatPriceDetails(reservation)
    
    return {
      to: userEmail,
      subject: `【BEE ART ENA】ご予約確認のお知らせ`,
      body: `
${reservation.customerName} 様

この度は、BEE ART ENAをご予約いただき、誠にありがとうございます。
以下の内容でご予約を承りました。

【ご予約内容】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 日時：${this.formatDate(reservation.date)} ${reservation.time}
■ メニュー：${reservation.serviceName}
${priceDetailsText}${maintenanceOptionsText}
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
理容師による安心のアートメイクサロン
Instagram: @beeartena
LINE: @174geemy
━━━━━━━━━━━━━━━━━━━━━━━━
`
    }
  }

  private createReservationNotificationTemplate(reservation: Reservation): EmailTemplate {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@beeartena.jp'
    const maintenanceOptionsText = this.formatMaintenanceOptions(reservation.maintenanceOptions)
    const priceDetailsText = this.formatPriceDetails(reservation)
    
    return {
      to: adminEmail,
      subject: `【予約通知】${this.formatDate(reservation.date)} ${reservation.time} - ${reservation.customerName}様`,
      body: `
新規予約が入りました。

【予約詳細】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約ID：${reservation.id}
■ 日時：${this.formatDate(reservation.date)} ${reservation.time}
■ 顧客名：${reservation.customerName}
■ 電話番号：${reservation.customerPhone}
■ メールアドレス：${reservation.customerEmail}
■ メニュー：${reservation.serviceName}
${priceDetailsText}${maintenanceOptionsText}
■ 備考：${reservation.notes || 'なし'}
━━━━━━━━━━━━━━━━━━━━━━━━

【管理画面】
https://beeartena-next.vercel.app/admin/dashboard

以上、ご確認をお願いいたします。
`
    }
  }

  private createCancellationConfirmationTemplate(reservation: Reservation, userEmail: string): EmailTemplate {
    return {
      to: userEmail,
      subject: `【BEE ART ENA】ご予約キャンセルのお知らせ`,
      body: `
${reservation.customerName} 様

ご予約のキャンセルを承りました。

【キャンセルされた予約】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 日時：${this.formatDate(reservation.date)} ${reservation.time}
■ メニュー：${reservation.serviceType} ${reservation.serviceName}
━━━━━━━━━━━━━━━━━━━━━━━━

またのご利用を心よりお待ちしております。

━━━━━━━━━━━━━━━━━━━━━━━━
BEE ART ENA
理容師による安心のアートメイクサロン
TEL: 090-5278-5221
Instagram: @beeartena
LINE: @174geemy
━━━━━━━━━━━━━━━━━━━━━━━━
`
    }
  }

  private createCancellationNotificationTemplate(reservation: Reservation): EmailTemplate {
    const adminEmail = process.env.ADMIN_EMAIL || 'info@beeartena.jp'
    return {
      to: adminEmail,
      subject: `【キャンセル通知】${this.formatDate(reservation.date)} ${reservation.time} - ${reservation.customerName}様`,
      body: `
予約がキャンセルされました。

【キャンセル詳細】
━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約ID：${reservation.id}
■ 日時：${this.formatDate(reservation.date)} ${reservation.time}
■ 顧客名：${reservation.customerName}
■ メニュー：${reservation.serviceType} ${reservation.serviceName}
■ キャンセル理由：${reservation.cancelReason || '理由なし'}
━━━━━━━━━━━━━━━━━━━━━━━━

【管理画面】
https://beeartena-next.vercel.app/admin/dashboard
`
    }
  }

  private createVerificationEmailTemplate(email: string, verificationLink: string): EmailTemplate {
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
理容師による安心のアートメイクサロン
━━━━━━━━━━━━━━━━━━━━━━━━
`
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
    return `${year}年${month}月${day}日(${weekday})`
  }

  private formatPrice(price: number): string {
    return price.toLocaleString()
  }

  private getMaintenanceOptionName(option: string): string {
    const optionNames: { [key: string]: string } = {
      'cut-shave': '眉カット＋フェイスシェービング',
      'nose-wax': '鼻毛ワックス脱毛',
      'bleach': '眉毛ブリーチ（脱色）'
    }
    return optionNames[option] || option
  }

  private formatMaintenanceOptions(maintenanceOptions?: string[]): string {
    if (!maintenanceOptions || maintenanceOptions.length === 0) {
      return ''
    }
    
    const optionsList = maintenanceOptions
      .map(option => `  ・${this.getMaintenanceOptionName(option)}`)
      .join('\n')
    
    return `■ メンテナンスオプション：\n${optionsList}\n`
  }

  private formatPriceDetails(reservation: Reservation): string {
    const basePrice = reservation.price
    const maintenancePrice = reservation.maintenancePrice || 0
    const totalPrice = reservation.totalPrice || basePrice
    const isMonitor = reservation.isMonitor
    const pointsUsed = reservation.pointsUsed || 0
    const finalPrice = reservation.finalPrice || totalPrice
    
    let priceText = `■ 料金：${this.formatPrice(basePrice)}円${isMonitor ? '（モニター価格）' : ''}\n`
    
    if (maintenancePrice > 0) {
      priceText += `■ メンテナンス料金：${this.formatPrice(maintenancePrice)}円\n`
    }
    
    if (pointsUsed > 0) {
      priceText += `■ ポイント利用：${pointsUsed}ポイント\n`
      priceText += `■ お支払い金額：${this.formatPrice(finalPrice - pointsUsed)}円\n`
    } else {
      priceText += `■ 合計金額：${this.formatPrice(totalPrice)}円\n`
    }
    
    return priceText
  }
}