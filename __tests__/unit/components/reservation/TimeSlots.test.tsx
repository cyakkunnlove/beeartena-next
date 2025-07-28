import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
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
    ]),
  },
}))

describe('TimeSlots', () => {
  const mockOnSelect = jest.fn()
  const mockDate = '2025-08-01'
  const mockSelected = '10:00'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render time slots after loading', async () => {
    const { getByText } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(getByText('10:00')).toBeInTheDocument()
      expect(getByText('11:00')).toBeInTheDocument()
      expect(getByText('12:00')).toBeInTheDocument()
      expect(getByText('13:00')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    const { container } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should call onSelect when time slot is clicked', async () => {
    const { getByText } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      const slot = getByText('11:00')
      fireEvent.click(slot)
      expect(mockOnSelect).toHaveBeenCalledWith('11:00')
    })
  })

  it('should show selected date', async () => {
    const { getByText } = render(
      <TimeSlots date={mockDate} onSelect={mockOnSelect} selected={mockSelected} />
    )

    await waitFor(() => {
      expect(getByText(/2025年8月1日/)).toBeInTheDocument()
    })
  })
})