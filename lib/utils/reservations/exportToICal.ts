import type { Reservation } from '@/lib/types'

const formatDateForIcs = (date: Date): string =>
  date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function exportReservationsToICal(reservations: Reservation[]): string {
  const events = reservations
    .filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed')
    .map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 2)

      return `BEGIN:VEVENT
UID:${reservation.id}@beeartena.jp
DTSTART:${formatDateForIcs(startDate)}
DTEND:${formatDateForIcs(endDate)}
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
BEGIN:VTIMEZONE
TZID:Asia/Tokyo
TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Tokyo
X-LIC-LOCATION:Asia/Tokyo
BEGIN:STANDARD
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
TZNAME:JST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
${events}
END:VCALENDAR`
}
