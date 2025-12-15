import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import TimeSlots from '@/components/reservation/TimeSlots'

const mockTimeSlots = [
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '12:00', available: false },
  { time: '13:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: false },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
]

describe('TimeSlots Component', () => {
  const mockOnSelect = jest.fn()
  const mockDate = '2025-08-01'
  const mockSelected = '10:00'

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSelect.mockReset()
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ timeSlots: mockTimeSlots }),
    })
  })

  it('should display loading state initially', () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should render all time slots after loading', async () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

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
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(screen.getByText(/2025年8月1日/)).toBeInTheDocument()
    })
  })

  it('should highlight the selected time slot', async () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const selectedSlot = screen.getByText('10:00')
      expect(selectedSlot).toHaveClass('bg-primary')
      expect(selectedSlot).toHaveClass('text-white')
    })
  })

  it('should disable unavailable time slots', async () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const unavailableSlot1 = screen.getByText('12:00')
      const unavailableSlot2 = screen.getByText('15:00')

      expect(unavailableSlot1).toHaveClass('bg-gray-100')
      expect(unavailableSlot1).toHaveClass('text-gray-400')
      expect(unavailableSlot1).toHaveClass('cursor-not-allowed')
      expect(unavailableSlot2).toHaveClass('bg-gray-100')
      expect(unavailableSlot2).toHaveClass('text-gray-400')
      expect(unavailableSlot2).toHaveClass('cursor-not-allowed')
    })
  })

  it('should call onSelect when an available slot is clicked', async () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => expect(screen.getByText('11:00')).toBeInTheDocument())
    const availableSlot = screen.getByText('11:00')
    act(() => {
      fireEvent.click(availableSlot)
    })
    expect(mockOnSelect).toHaveBeenCalledWith('11:00')
  })

  it('should not call onSelect when an unavailable slot is clicked', async () => {
    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => expect(screen.getByText('12:00')).toBeInTheDocument())
    const unavailableSlot = screen.getByText('12:00')
    act(() => {
      fireEvent.click(unavailableSlot)
    })
    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('should fetch new time slots when date changes', async () => {
    const { rerender } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />,
    )

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalled()
    })

    const newDate = '2025-08-02'
    rerender(<TimeSlots date={newDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const calls = ((global as any).fetch as jest.Mock).mock.calls as Array<[string]>
      const urls = calls.map((c) => c[0])
      expect(urls.some((url) => url.includes(`date=${newDate}`))).toBe(true)
    })
  })

  it('should handle error when fetching time slots fails', async () => {
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed' }),
    })

    const consoleError = jest.spyOn(console, 'error').mockImplementation()

    render(<TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(screen.getByText('時間枠の取得に失敗しました。もう一度お試しください。')).toBeInTheDocument()
    })

    consoleError.mockRestore()
  })
})

