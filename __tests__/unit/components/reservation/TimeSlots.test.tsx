import React from 'react'
import { render, fireEvent, waitFor } from '@/test/utils/render'
import TimeSlots from '@/components/reservation/TimeSlots'
import { createMockTimeSlot } from '@/test/utils/mockData'
import '@testing-library/jest-dom'

describe('TimeSlots', () => {
  const mockSlots = [
    createMockTimeSlot({ time: '10:00', available: true }),
    createMockTimeSlot({ time: '11:00', available: true }),
    createMockTimeSlot({ time: '12:00', available: false }),
    createMockTimeSlot({ time: '13:00', available: true }),
  ]

  const mockOnSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all time slots', () => {
    const { getByText } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} />)

    expect(getByText('10:00')).toBeInTheDocument()
    expect(getByText('11:00')).toBeInTheDocument()
    expect(getByText('12:00')).toBeInTheDocument()
    expect(getByText('13:00')).toBeInTheDocument()
  })

  it('should show available slots as clickable', () => {
    const { getByText } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} />)

    const availableSlot = getByText('10:00').closest('button')
    expect(availableSlot).not.toBeDisabled()
    expect(availableSlot).toHaveClass('hover:bg-pink-50')
  })

  it('should show unavailable slots as disabled', () => {
    const { getByText } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} />)

    const unavailableSlot = getByText('12:00').closest('button')
    expect(unavailableSlot).toBeDisabled()
    expect(unavailableSlot).toHaveClass('opacity-50')
  })

  it('should call onSelect when available slot is clicked', () => {
    const { getByText } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} />)

    const slot = getByText('10:00').closest('button')
    fireEvent.click(slot!)

    expect(mockOnSelect).toHaveBeenCalledWith('10:00')
  })

  it('should not call onSelect when unavailable slot is clicked', () => {
    const { getByText } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} />)

    const slot = getByText('12:00').closest('button')
    fireEvent.click(slot!)

    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('should highlight selected slot', () => {
    const { getByText } = render(
      <TimeSlots slots={mockSlots} onSelect={mockOnSelect} selectedTime="11:00" />,
    )

    const selectedSlot = getByText('11:00').closest('button')
    expect(selectedSlot).toHaveClass('bg-pink-500')
    expect(selectedSlot).toHaveClass('text-white')
  })

  it('should handle empty slots array', () => {
    const { getByText } = render(<TimeSlots slots={[]} onSelect={mockOnSelect} />)

    expect(getByText('利用可能な時間枠がありません')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    const { getByTestId } = render(<TimeSlots slots={mockSlots} onSelect={mockOnSelect} loading />)

    expect(getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
