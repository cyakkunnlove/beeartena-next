import { Reservation } from '@/lib/types'

// 予約一覧をiCalフォーマットに変換するユーティリティ
export function exportReservationsToICal(reservations: Reservation[]): string {
  const events = reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 2)

      const formatDate = (date: Date): string =>
        date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

      return `BEGIN:VEVENT
UID:${reservation.id}@beeartena.jp
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${reservation.serviceName} - ${reservation.customerName}
DESCRIPTION:${reservation.serviceName}\\n顧客: ${reservation.customerName}\\n電話: ${reservation.customerPhone}\\n${reservation.notes || ''}
LOCATION:Bee Artena
STATUS:CONFIRMED
END:VEVENT`
    })
    .join('\n')

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bee Artena//Reservation System//JP
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Bee Artena 予約
X-WR-TIMEZONE:Asia/Tokyo
${events}
END:VCALENDAR`
}
