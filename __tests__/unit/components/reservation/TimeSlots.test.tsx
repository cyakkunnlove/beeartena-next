import React from 'react'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import TimeSlots from '@/components/reservation/TimeSlots'
import '@testing-library/jest-dom'

// Mock the reservationService
jest.mock('@/lib/reservationService', () => ({
  reservationService: {
    getTimeSlotsForDate: jest.fn().mockResolvedValue([
      { time: '10:00', available: true },
      { time: '11:00', available: true },
      { time: '12:00', available: false },
      { time: '13:00', available: true },
      { time: '14:00', available: true },
      { time: '15:00', available: false },
      { time: '16:00', available: true },
      { time: '17:00', available: true },
    ]),
  },
}))

describe('TimeSlots Component', () => {
  const mockOnSelect = jest.fn()
  const mockDate = '2025-08-01'
  const mockSelected = '10:00'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    const spinner = screen.getByRole('status', { hidden: true })
    expect(spinner).toHaveClass('animate-spin')
  })

  it('should render all time slots after loading', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('11:00')).toBeInTheDocument()
      expect(screen.getByText('12:00')).toBeInTheDocument()
      expect(screen.getByText('13:00')).toBeInTheDocument()
      expect(screen.getByText('14:00')).toBeInTheDocument()
      expect(screen.getByText('15:00')).toBeInTheDocument()
      expect(screen.getByText('16:00')).toBeInTheDocument()
      expect(screen.getByText('17:00')).toBeInTheDocument()
    })
  })

  it('should display the selected date in Japanese format', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(screen.getByText(/2025年8月1日/)).toBeInTheDocument()
    })
  })

  it('should highlight the selected time slot', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      const selectedSlot = screen.getByText('10:00').parentElement
      expect(selectedSlot).toHaveClass('bg-primary')
      expect(selectedSlot).toHaveClass('text-white')
    })
  })

  it('should disable unavailable time slots', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      const unavailableSlot1 = screen.getByText('12:00').parentElement
      const unavailableSlot2 = screen.getByText('15:00').parentElement
      
      expect(unavailableSlot1).toHaveClass('opacity-50')
      expect(unavailableSlot1).toHaveClass('cursor-not-allowed')
      expect(unavailableSlot2).toHaveClass('opacity-50')
      expect(unavailableSlot2).toHaveClass('cursor-not-allowed')
    })
  })

  it('should call onSelect when an available slot is clicked', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      const availableSlot = screen.getByText('11:00')
      fireEvent.click(availableSlot)
      expect(mockOnSelect).toHaveBeenCalledWith('11:00')
    })
  })

  it('should not call onSelect when an unavailable slot is clicked', async () => {
    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      const unavailableSlot = screen.getByText('12:00')
      fireEvent.click(unavailableSlot)
      expect(mockOnSelect).not.toHaveBeenCalled()
    })
  })

  it('should fetch new time slots when date changes', async () => {
    const { reservationService } = require('@/lib/reservationService')
    const { rerender } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(reservationService.getTimeSlotsForDate).toHaveBeenCalledWith(mockDate)
    })

    // Change the date
    const newDate = '2025-08-02'
    rerender(
      <TimeSlots date={newDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(reservationService.getTimeSlotsForDate).toHaveBeenCalledWith(newDate)
    })
  })

  it('should handle error when fetching time slots fails', async () => {
    const { reservationService } = require('@/lib/reservationService')
    reservationService.getTimeSlotsForDate.mockRejectedValueOnce(new Error('Network error'))
    
    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('時間枠の取得に失敗しました:', expect.any(Error))
    })

    consoleError.mockRestore()
  })
})