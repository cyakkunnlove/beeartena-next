import React from 'react'
import { render, screen } from '@testing-library/react'
import BusinessHoursInfo from '@/components/reservation/BusinessHoursInfo'
import { reservationService } from '@/lib/reservationService'
import { ReservationSettings } from '@/lib/types'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}))

// Mock reservationService
jest.mock('@/lib/reservationService', () => ({
  reservationService: {
    getSettings: jest.fn(),
  },
}))

describe('BusinessHoursInfo Component', () => {
  const mockDefaultSettings: ReservationSettings = {
    slotDuration: 120,
    maxCapacityPerSlot: 1,
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
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(reservationService.getSettings as jest.Mock).mockReturnValue(mockDefaultSettings)
  })

  describe('Rendering', () => {
    it('should render the business hours heading', () => {
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('営業時間')).toBeInTheDocument()
    })

    it('should render the reservation policy note', () => {
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('※ 1日1名限定の完全予約制となっております')).toBeInTheDocument()
    })

    it('should group days with same hours', () => {
      render(<BusinessHoursInfo />)
      
      // 月・火・木・金・土 have same hours (18:30〜20:30)
      expect(screen.getByText('月・火・木・金・土曜日:')).toBeInTheDocument()
      expect(screen.getByText('18:30〜20:30')).toBeInTheDocument()
      
      // 水曜日 has different hours (09:00〜17:00)
      expect(screen.getByText('水曜日:')).toBeInTheDocument()
      expect(screen.getByText('09:00〜17:00')).toBeInTheDocument()
    })

    it('should display closed days', () => {
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('休業日:')).toBeInTheDocument()
      expect(screen.getByText('日曜日')).toBeInTheDocument()
    })

    it('should apply correct styling classes', () => {
      const { container } = render(<BusinessHoursInfo />)
      
      const mainDiv = container.firstChild
      expect(mainDiv).toHaveClass('bg-light-accent', 'rounded-lg', 'p-4', 'mb-6')
      
      const heading = screen.getByText('営業時間')
      expect(heading).toHaveClass('font-semibold', 'text-gray-700', 'mb-2')
    })
  })

  describe('Business Hours Grouping', () => {
    it('should handle all days closed', () => {
      const allClosedSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: mockDefaultSettings.businessHours.map(h => ({
          ...h,
          isOpen: false,
        })),
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(allClosedSettings)
      
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('休業日:')).toBeInTheDocument()
      expect(screen.getByText('日・月・火・水・木・金・土曜日')).toBeInTheDocument()
    })

    it('should handle all days with same hours', () => {
      const sameHoursSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: mockDefaultSettings.businessHours.map(h => ({
          ...h,
          open: '10:00',
          close: '18:00',
          isOpen: true,
        })),
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(sameHoursSettings)
      
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('日・月・火・水・木・金・土曜日:')).toBeInTheDocument()
      expect(screen.getByText('10:00〜18:00')).toBeInTheDocument()
      expect(screen.queryByText('休業日:')).not.toBeInTheDocument()
    })

    it('should handle all different hours', () => {
      const differentHoursSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [
          { dayOfWeek: 0, open: '09:00', close: '12:00', isOpen: true },
          { dayOfWeek: 1, open: '10:00', close: '13:00', isOpen: true },
          { dayOfWeek: 2, open: '11:00', close: '14:00', isOpen: true },
          { dayOfWeek: 3, open: '12:00', close: '15:00', isOpen: true },
          { dayOfWeek: 4, open: '13:00', close: '16:00', isOpen: true },
          { dayOfWeek: 5, open: '14:00', close: '17:00', isOpen: true },
          { dayOfWeek: 6, open: '15:00', close: '18:00', isOpen: true },
        ],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(differentHoursSettings)
      
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('日曜日:')).toBeInTheDocument()
      expect(screen.getByText('09:00〜12:00')).toBeInTheDocument()
      
      expect(screen.getByText('月曜日:')).toBeInTheDocument()
      expect(screen.getByText('10:00〜13:00')).toBeInTheDocument()
      
      // Should have 7 different time entries
      const timeEntries = screen.getAllByText(/^\d{2}:\d{2}〜\d{2}:\d{2}$/)
      expect(timeEntries).toHaveLength(7)
    })

    it('should handle mixed open and closed days', () => {
      const mixedSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [
          { dayOfWeek: 0, open: '', close: '', isOpen: false }, // 日曜休み
          { dayOfWeek: 1, open: '10:00', close: '18:00', isOpen: true }, // 月曜
          { dayOfWeek: 2, open: '', close: '', isOpen: false }, // 火曜休み
          { dayOfWeek: 3, open: '10:00', close: '18:00', isOpen: true }, // 水曜
          { dayOfWeek: 4, open: '', close: '', isOpen: false }, // 木曜休み
          { dayOfWeek: 5, open: '10:00', close: '18:00', isOpen: true }, // 金曜
          { dayOfWeek: 6, open: '', close: '', isOpen: false }, // 土曜休み
        ],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(mixedSettings)
      
      render(<BusinessHoursInfo />)
      
      expect(screen.getByText('月・水・金曜日:')).toBeInTheDocument()
      expect(screen.getByText('10:00〜18:00')).toBeInTheDocument()
      
      expect(screen.getByText('休業日:')).toBeInTheDocument()
      expect(screen.getByText('日・火・木・土曜日')).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      render(<BusinessHoursInfo />)
      
      // Check time format is HH:MM〜HH:MM
      expect(screen.getByText('18:30〜20:30')).toBeInTheDocument()
      expect(screen.getByText('09:00〜17:00')).toBeInTheDocument()
    })

    it('should handle empty time strings', () => {
      const emptyTimeSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [
          { dayOfWeek: 0, open: '', close: '', isOpen: true }, // Open but no times
          ...mockDefaultSettings.businessHours.slice(1),
        ],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(emptyTimeSettings)
      
      render(<BusinessHoursInfo />)
      
      // Should render "〜" for empty times
      expect(screen.getByText('日曜日:')).toBeInTheDocument()
      expect(screen.getByText('〜')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle no open days', () => {
      const noOpenDaysSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: mockDefaultSettings.businessHours.map(h => ({
          ...h,
          isOpen: false,
        })),
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(noOpenDaysSettings)
      
      render(<BusinessHoursInfo />)
      
      // Should still show the component structure
      expect(screen.getByText('営業時間')).toBeInTheDocument()
      expect(screen.getByText('休業日:')).toBeInTheDocument()
    })

    it('should handle missing business hours data', () => {
      const emptySettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(emptySettings)
      
      render(<BusinessHoursInfo />)
      
      // Should render without errors
      expect(screen.getByText('営業時間')).toBeInTheDocument()
      expect(screen.getByText('※ 1日1名限定の完全予約制となっております')).toBeInTheDocument()
    })

    it('should handle malformed time data', () => {
      const malformedSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [
          { dayOfWeek: 0, open: '25:00', close: '26:00', isOpen: true }, // Invalid times
          { dayOfWeek: 1, open: 'invalid', close: 'time', isOpen: true },
          ...mockDefaultSettings.businessHours.slice(2),
        ],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(malformedSettings)
      
      // Should render without crashing
      expect(() => render(<BusinessHoursInfo />)).not.toThrow()
    })
  })

  describe('Days of Week', () => {
    it('should use correct Japanese day names', () => {
      render(<BusinessHoursInfo />)
      
      const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']
      
      // At least some days should be visible
      const visibleDays = daysOfWeek.filter(day => 
        screen.queryByText(new RegExp(day + '曜日'))
      )
      
      expect(visibleDays.length).toBeGreaterThan(0)
    })

    it('should handle day ordering correctly', () => {
      const customSettings: ReservationSettings = {
        ...mockDefaultSettings,
        businessHours: [
          { dayOfWeek: 0, open: '10:00', close: '11:00', isOpen: true }, // 日
          { dayOfWeek: 1, open: '10:00', close: '11:00', isOpen: true }, // 月
          { dayOfWeek: 2, open: '12:00', close: '13:00', isOpen: true }, // 火
          { dayOfWeek: 3, open: '12:00', close: '13:00', isOpen: true }, // 水
          { dayOfWeek: 4, open: '14:00', close: '15:00', isOpen: true }, // 木
          { dayOfWeek: 5, open: '14:00', close: '15:00', isOpen: true }, // 金
          { dayOfWeek: 6, open: '16:00', close: '17:00', isOpen: true }, // 土
        ],
      }
      ;(reservationService.getSettings as jest.Mock).mockReturnValue(customSettings)
      
      render(<BusinessHoursInfo />)
      
      // Days should be grouped correctly
      expect(screen.getByText('日・月曜日:')).toBeInTheDocument()
      expect(screen.getByText('火・水曜日:')).toBeInTheDocument()
      expect(screen.getByText('木・金曜日:')).toBeInTheDocument()
      expect(screen.getByText('土曜日:')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply correct text colors', () => {
      render(<BusinessHoursInfo />)
      
      const closedDaysElement = screen.getByText('休業日:').parentElement
      expect(closedDaysElement).toHaveClass('text-red-500')
      
      const noteElement = screen.getByText('※ 1日1名限定の完全予約制となっております')
      expect(noteElement).toHaveClass('text-xs', 'text-gray-500')
    })

    it('should have proper spacing', () => {
      const { container } = render(<BusinessHoursInfo />)
      
      const contentDiv = container.querySelector('.space-y-1')
      expect(contentDiv).toBeInTheDocument()
      
      const noteDiv = screen.getByText('※ 1日1名限定の完全予約制となっております')
      expect(noteDiv).toHaveClass('mt-3')
    })
  })
})