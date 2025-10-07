'use client'

import * as React from 'react'
import moment from 'moment'
import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'

import 'moment/locale/ja'
import { Reservation, CalendarEvent, CalendarEventProps, CalendarToolbarProps } from '@/lib/types'

moment.locale('ja')
const localizer = momentLocalizer(moment)

interface ReservationCalendarProps {
  reservations: Reservation[]
  onEventClick: (reservation: Reservation) => void
  onDateClick?: (date: Date) => void
}

export default function ReservationCalendar({
  reservations,
  onEventClick,
  onDateClick,
}: ReservationCalendarProps) {
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  // 予約をカレンダーイベントに変換
  const events = useMemo(() => {
    return reservations.map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 2) // 2時間の施術

      return {
        id: reservation.id,
        title: `${reservation.serviceName} - ${reservation.customerName}`,
        start: startDate,
        end: endDate,
        resource: reservation,
        status: reservation.status,
      }
    })
  }, [reservations])

  // イベントクリックハンドラー
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventClick(event.resource)
    },
    [onEventClick],
  )

  // 空いている時間枠クリックハンドラー
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onDateClick) {
        onDateClick(slotInfo.start)
      }
    },
    [onDateClick],
  )

  // カスタムイベントコンポーネント
  const EventComponent = ({ event }: CalendarEventProps) => {
    const statusClass = `status-${event.resource.status}`
    return (
      <div className={`rbc-event ${statusClass}`}>
        <div className="font-semibold">{event.resource.customerName}</div>
        <div className="text-xs">{event.resource.serviceName}</div>
      </div>
    )
  }

  // カスタムツールバー
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
      toolbar.onNavigate('NEXT')
    }

    const goToToday = () => {
      toolbar.onNavigate('TODAY')
    }

    const viewNames = {
      month: '月',
      week: '週',
      day: '日',
      agenda: '一覧',
    }

    return (
      <div className="rbc-toolbar">
        <div className="flex gap-2">
          <button onClick={goToBack}>←</button>
          <button onClick={goToToday}>今日</button>
          <button onClick={goToNext}>→</button>
        </div>

        <span className="text-lg font-semibold">{toolbar.label}</span>

        <div className="flex gap-2">
          {(['month', 'week', 'day', 'agenda'] as const).map((name) => (
            <button
              key={name}
              onClick={() => toolbar.onView(name)}
              className={toolbar.view === name ? 'rbc-active' : ''}
            >
              {viewNames[name as keyof typeof viewNames]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 日付のスタイリング
  const dayPropGetter = useCallback(
    (date: Date) => {
      const dateStr = moment(date).format('YYYY-MM-DD')
      const dayOfWeek = date.getDay()

      // 日曜日は休業日
      if (dayOfWeek === 0) {
        return {
          style: {
            backgroundColor: '#f3f4f6',
          },
        }
      }

      // 満員の日をチェック
      const dayReservations = reservations.filter(
        (r) => r.date === dateStr && (r.status === 'confirmed' || r.status === 'pending'),
      )

      // 曜日ごとの最大予約数
      const maxCapacity = dayOfWeek === 3 ? 4 : 2 // 水曜日は4枠、その他は2枠

      if (dayReservations.length >= maxCapacity) {
        return {
          style: {
            backgroundColor: '#fee2e2',
          },
        }
      }

      return {}
    },
    [reservations],
  )

  // イベントのスタイリング
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource.status
    let backgroundColor = '#3b82f6' // default blue

    switch (status) {
      case 'pending':
        backgroundColor = '#eab308'
        break
      case 'confirmed':
        backgroundColor = '#3b82f6'
        break
      case 'completed':
        backgroundColor = '#22c55e'
        break
      case 'cancelled':
        backgroundColor = '#ef4444'
        break
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    }
  }, [])

  const messages = {
    allDay: '終日',
    previous: '前',
    next: '次',
    today: '今日',
    month: '月',
    week: '週',
    day: '日',
    agenda: '一覧',
    date: '日付',
    time: '時間',
    event: '予約',
    noEventsInRange: 'この期間に予約はありません',
    showMore: (total: number) => `+${total} 件`,
  }

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={(newView) => setView(newView)}
        date={date}
        onNavigate={(newDate) => setDate(newDate)}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        components={{
          toolbar: CustomToolbar,
          event: EventComponent,
        }}
        dayPropGetter={dayPropGetter}
        eventPropGetter={eventPropGetter}
        messages={messages}
        formats={{
          monthHeaderFormat: 'YYYY年 M月',
          dayFormat: 'D',
          dayHeaderFormat: 'M月D日(ddd)',
          dayRangeHeaderFormat: ({ start, end }) =>
            `${moment(start).format('M月D日')} - ${moment(end).format('M月D日')}`,
        }}
      />
    </div>
  )
}
