import React from 'react'
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import Calendar from '@/components/reservation/Calendar'
import '@testing-library/jest-dom'

// Mock the reservationService
jest.mock('@/lib/reservationService', () => ({
  reservationService: {
    getMonthAvailability: jest.fn().mockResolvedValue(
      new Map([
        ['2025-08-01', true],
        ['2025-08-02', true],
        ['2025-08-03', false],
        ['2025-08-04', true],
        ['2025-08-05', true],
        ['2025-08-10', true],
        ['2025-08-15', false],
        ['2025-08-20', true],
        ['2025-08-25', true],
      ])
    ),
  },
}))

// Mock the current date to be in August 2025
const mockDate = new Date('2025-08-01T12:00:00')
jest.useFakeTimers()
jest.setSystemTime(mockDate)

describe('Calendar Component', () => {
  const mockOnSelect = jest.fn()
  const mockSelected = '2025-08-05' // Tuesday, August 5, 2025

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('should render calendar with current month', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })
  })

  it('should render all weekday headers', () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('火')).toBeInTheDocument()
    expect(screen.getByText('水')).toBeInTheDocument()
    expect(screen.getByText('木')).toBeInTheDocument()
    expect(screen.getByText('金')).toBeInTheDocument()
    expect(screen.getByText('土')).toBeInTheDocument()
  })

  it('should render days of the month', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      // Check for some specific days
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('31')).toBeInTheDocument()
    })
  })

  it('should highlight selected date', async () => {
    // Adjust mock to ensure the selected date is available
    const { reservationService } = require('@/lib/reservationService')
    reservationService.getMonthAvailability.mockResolvedValue(
      new Map([
        ['2025-08-01', true],
        ['2025-08-02', true],
        ['2025-08-03', false],
        ['2025-08-04', true],
        ['2025-08-05', true], // Make sure our selected date is available
        ['2025-08-10', true],
        ['2025-08-15', false],
        ['2025-08-20', true],
        ['2025-08-25', true],
      ])
    )

    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const selectedDay = screen.getByText('5')
      expect(selectedDay).toHaveClass('bg-primary')
      expect(selectedDay).toHaveClass('text-white')
    })
  })

  it('should call onSelect when available date is clicked', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    await waitFor(() => {
      const availableDay = screen.getByText('10') // Use a different available date (August 10)
      act(() => {
        fireEvent.click(availableDay)
      })
      
      expect(mockOnSelect).toHaveBeenCalledWith('2025-08-10')
    })
  })

  it('should not call onSelect when unavailable date is clicked', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const unavailableDay = screen.getByText('3')
      act(() => {
        fireEvent.click(unavailableDay)
      })
      expect(mockOnSelect).not.toHaveBeenCalled()
    })
  })

  it('should navigate to next month', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })

    // Find the next button by its position in the navigation header
    const navButtons = document.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1] // The second button in the navigation header
    
    act(() => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年9月')).toBeInTheDocument()
    })
  })

  it('should disable previous month button for current month', () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    const prevButton = screen.getAllByRole('button')[0]
    expect(prevButton).toBeDisabled()
  })

  it('should show legend for calendar states', () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    expect(screen.getByText('予約可能')).toBeInTheDocument()
    expect(screen.getByText('満員')).toBeInTheDocument()
    expect(screen.getByText('予約不可')).toBeInTheDocument()
  })

  it('should mark unavailable dates with red dot', async () => {
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      const unavailableDay = screen.getByText('3')
      const redDot = unavailableDay.parentElement?.querySelector('.text-red-500')
      expect(redDot).toBeInTheDocument()
      expect(redDot).toHaveTextContent('●')
    })
  })

  it('should fetch availability when month changes', async () => {
    const { reservationService } = require('@/lib/reservationService')
    render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)

    await waitFor(() => {
      expect(reservationService.getMonthAvailability).toHaveBeenCalledWith(2025, 7) // August is month 7 (0-indexed)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })

    // Clear the mock calls
    reservationService.getMonthAvailability.mockClear()

    // Navigate to next month
    const navButtons = document.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1] // The second button in the navigation header
    
    act(() => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(reservationService.getMonthAvailability).toHaveBeenCalledWith(2025, 8) // September
    })
  })
})