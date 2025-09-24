import type { Reservation } from '@/lib/types'

export interface EmailTemplate {
  subject: string
  body: string
  to: string
  from?: string
}

export interface EmailService {
  sendEmail(template: EmailTemplate): Promise<void>
  sendReservationConfirmation(reservation: Reservation, userEmail: string): Promise<void>
  sendReservationNotificationToAdmin(reservation: Reservation): Promise<void>
  sendCancellationConfirmation(reservation: Reservation, userEmail: string): Promise<void>
  sendCancellationNotificationToAdmin(reservation: Reservation): Promise<void>
  sendVerificationEmail(email: string, verificationLink: string): Promise<void>
}
