import { Reservation, TimeSlot, BusinessHours, ReservationSettings } from '@/lib/types';
import { storageService } from '@/lib/storage/storageService';

class ReservationService {
  private settings: ReservationSettings = {
    slotDuration: 120, // 2時間
    maxCapacityPerSlot: 1, // 1枠1人
    businessHours: [
      { dayOfWeek: 0, open: '', close: '', isOpen: false }, // 日曜休み
      { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true }, // 月曜
      { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true }, // 火曜
      { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true }, // 水曜
      { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true }, // 木曜
      { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true }, // 金曜
      { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true }, // 土曜
    ],
    blockedDates: [],
  };

  constructor() {
    // Load settings from localStorage if exists
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservationSettings');
      if (saved) {
        this.settings = JSON.parse(saved);
      }
    }
  }

  saveSettings(settings: ReservationSettings): void {
    this.settings = settings;
    if (typeof window !== 'undefined') {
      localStorage.setItem('reservationSettings', JSON.stringify(settings));
    }
  }

  getSettings(): ReservationSettings {
    return this.settings;
  }

  // 特定の日付の予約可能な時間枠を取得
  getTimeSlotsForDate(date: string): TimeSlot[] {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const businessHours = this.settings.businessHours[dayOfWeek];

    if (!businessHours.isOpen || this.settings.blockedDates?.includes(date)) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const reservations = storageService.getAllReservations()
      .filter(r => r.date === date && r.status !== 'cancelled');

    // 水曜日は時間枠が多い
    if (dayOfWeek === 3) {
      // 9:00-17:00の営業時間で2時間枠
      for (let hour = 9; hour < 17; hour += 2) {
        const timeStr = `${hour}:00`;
        const bookingsAtTime = reservations.filter(r => r.time === timeStr).length;
        
        slots.push({
          time: timeStr,
          available: bookingsAtTime < this.settings.maxCapacityPerSlot,
          date: date,
          maxCapacity: this.settings.maxCapacityPerSlot,
          currentBookings: bookingsAtTime,
        });
      }
    } else if (businessHours.isOpen) {
      // その他の曜日は18:30と19:30のみ
      ['18:30', '19:30'].forEach(time => {
        const bookingsAtTime = reservations.filter(r => r.time === time).length;
        
        slots.push({
          time: time,
          available: bookingsAtTime < this.settings.maxCapacityPerSlot,
          date: date,
          maxCapacity: this.settings.maxCapacityPerSlot,
          currentBookings: bookingsAtTime,
        });
      });
    }

    return slots;
  }

  // 特定の日付が予約可能かチェック
  isDateAvailable(date: string): boolean {
    const slots = this.getTimeSlotsForDate(date);
    return slots.some(slot => slot.available);
  }

  // 月の予約状況サマリーを取得
  getMonthAvailability(year: number, month: number): Map<string, boolean> {
    const availability = new Map<string, boolean>();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // 過去の日付は予約不可
      if (date < new Date()) {
        availability.set(dateStr, false);
      } else {
        availability.set(dateStr, this.isDateAvailable(dateStr));
      }
    }

    return availability;
  }

  // 予約をカレンダーイベント形式に変換
  getCalendarEvents(reservations: Reservation[]): any[] {
    return reservations.map(reservation => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 2); // 2時間の施術

      return {
        id: reservation.id,
        title: `${reservation.serviceName} - ${reservation.customerName}`,
        start: startDate,
        end: endDate,
        resource: reservation,
        allDay: false,
        status: reservation.status,
      };
    });
  }

  // iCalフォーマットでエクスポート
  exportToICal(reservations: Reservation[]): string {
    const events = reservations
      .filter(r => r.status === 'confirmed' || r.status === 'completed')
      .map(reservation => {
        const startDate = new Date(`${reservation.date}T${reservation.time}`);
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 2);

        const formatDate = (date: Date): string => {
          return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        };

        return `BEGIN:VEVENT
UID:${reservation.id}@beeartena.jp
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${reservation.serviceName} - ${reservation.customerName}
DESCRIPTION:${reservation.serviceName}\\n顧客: ${reservation.customerName}\\n電話: ${reservation.customerPhone}\\n${reservation.notes || ''}
LOCATION:Bee Artena
STATUS:CONFIRMED
END:VEVENT`;
      }).join('\n');

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
END:VCALENDAR`;
  }

  // 営業時間を更新
  updateBusinessHours(dayOfWeek: number, hours: Partial<BusinessHours>): void {
    if (this.settings.businessHours[dayOfWeek]) {
      this.settings.businessHours[dayOfWeek] = {
        ...this.settings.businessHours[dayOfWeek],
        ...hours,
      };
      this.saveSettings(this.settings);
    }
  }

  // ブロック日を追加/削除
  toggleBlockedDate(date: string): void {
    if (!this.settings.blockedDates) {
      this.settings.blockedDates = [];
    }

    const index = this.settings.blockedDates.indexOf(date);
    if (index === -1) {
      this.settings.blockedDates.push(date);
    } else {
      this.settings.blockedDates.splice(index, 1);
    }

    this.saveSettings(this.settings);
  }
}

export const reservationService = new ReservationService();