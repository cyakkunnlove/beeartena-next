import React from 'react'
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import Calendar from '@/components/reservation/Calendar'
import '@testing-library/jest-dom'

// Mock the reservationService
jest.mock('@/lib/reservationService', () => ({
  reservationService: {
    getMonthAvailability: jest.fn().mockImplementation((year, month) => {
      // Return different data based on the month
      if (month === 6) {
        // July (0-indexed)
        const availability = new Map()
        // Fill all July dates with availability status
        for (let day = 1; day <= 31; day++) {
          const dateStr = `2025-07-${day.toString().padStart(2, '0')}`
          // Make most dates available, except 25th
          availability.set(dateStr, day !== 25)
        }
        return Promise.resolve(availability)
      } else if (month === 7) {
        // August (0-indexed)
        const availability = new Map()
        // Fill all August dates with availability status
        for (let day = 1; day <= 31; day++) {
          const dateStr = `2025-08-${day.toString().padStart(2, '0')}`
          // Make specific dates unavailable
          const unavailableDates = [3, 15]
          availability.set(dateStr, !unavailableDates.includes(day))
        }
        return Promise.resolve(availability)
      }
      return Promise.resolve(new Map())
    }),
  },
}))

describe('Calendar Component', () => {
  const mockOnSelect = jest.fn()
  const mockSelected = '2025-08-05' // Tuesday, August 5, 2025

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the current date to be in July 2025 so August dates are in the future
    const mockDate = new Date('2025-07-15T12:00:00')
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render calendar with current month', async () => {
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    await waitFor(() => {
      // Should show July initially since that's the mocked current month
      expect(screen.getByText('2025年7月')).toBeInTheDocument()
    })
  })

  it('should render all weekday headers', async () => {
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('火')).toBeInTheDocument()
    expect(screen.getByText('水')).toBeInTheDocument()
    expect(screen.getByText('木')).toBeInTheDocument()
    expect(screen.getByText('金')).toBeInTheDocument()
    expect(screen.getByText('土')).toBeInTheDocument()
  })

  it('should render days of the month', async () => {
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    // First navigate to August
    const navButtons = document.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1]

    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      // Check for some specific days in August
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('31')).toBeInTheDocument()
    })
  })

  it.skip('should highlight selected date', async () => {
    // Use the current date (July 15th) as selected since it's not in the past
    const julySelected = '2025-07-15'

    let container: HTMLElement = null!
    await act(async () => {
      const result = render(<Calendar onSelect={mockOnSelect} selected={julySelected} />)
      container = result.container
    })

    await waitFor(() => {
      const buttons = container.querySelectorAll('button')
      const dayButtons = Array.from(buttons).filter(
        (btn) => btn.textContent && /^\d+$/.test(btn.textContent.trim()),
      )
      const selectedButton = dayButtons.find((btn) => btn.textContent === '15')

      expect(selectedButton).toBeTruthy()
      expect(selectedButton?.className).toContain('bg-primary')
      expect(selectedButton?.className).toContain('text-white')
    })
  })

  it.skip('should call onSelect when available date is clicked', async () => {
    let container: HTMLElement = null!
    await act(async () => {
      const result = render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
      container = result.container
    })

    // Navigate to August first
    const navButtons = container.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1]

    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })

    // Re-query buttons after navigation
    const buttons = container.querySelectorAll('button')
    const dayButtons = Array.from(buttons).filter(
      (btn) => btn.textContent && /^\d+$/.test(btn.textContent.trim()),
    )

    // Find the button by index to avoid confusion - August starts on Friday
    // Index mapping: 0=Friday 1st, 1=Saturday 2nd, 2=Sunday 3rd, etc.
    // We want the 20th which is index 19
    const targetButton = dayButtons[19] // 20th of August

    expect(targetButton).toBeTruthy()
    expect(targetButton.textContent).toBe('20')
    expect(targetButton).not.toBeDisabled()

    fireEvent.click(targetButton!)

    expect(mockOnSelect).toHaveBeenCalledWith('2025-08-20')
  })

  it.skip('should not call onSelect when unavailable date is clicked', async () => {
    let container: HTMLElement = null!
    await act(async () => {
      const result = render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
      container = result.container
    })

    // Stay in July and click on the 25th which is marked as unavailable in our mock
    await waitFor(() => {
      expect(screen.getByText('2025年7月')).toBeInTheDocument()
    })

    const buttons = container.querySelectorAll('button')
    const dayButtons = Array.from(buttons).filter(
      (btn) => btn.textContent && /^\d+$/.test(btn.textContent.trim()),
    )
    // July 25th is marked as unavailable in our mock
    const unavailableButton = dayButtons.find((btn) => btn.textContent === '25')

    expect(unavailableButton).toBeTruthy()
    expect(unavailableButton).toBeDisabled()

    fireEvent.click(unavailableButton!)

    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('should navigate to next month', async () => {
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年7月')).toBeInTheDocument()
    })

    // Find the next button by its position in the navigation header
    const navButtons = document.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1] // The second button in the navigation header

    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })
  })

  it('should disable previous month button for current month', async () => {
    // First navigate to July (current month)
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected="2025-07-15" />)
    })

    const prevButton = screen.getAllByRole('button')[0]
    expect(prevButton).toBeDisabled()
  })

  it('should show legend for calendar states', async () => {
    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    expect(screen.getByText('予約可能')).toBeInTheDocument()
    expect(screen.getByText('満員')).toBeInTheDocument()
    expect(screen.getByText('予約不可')).toBeInTheDocument()
  })

  it('should mark unavailable dates with red dot', async () => {
    let container: HTMLElement = null!
    await act(async () => {
      const result = render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
      container = result.container
    })

    // Navigate to August first
    const navButtons = container.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1]

    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年8月')).toBeInTheDocument()
    })

    await waitFor(() => {
      // Use 15th which is marked as unavailable and not a Sunday
      const unavailableDay = screen.getByText('15')
      const redDot = unavailableDay.parentElement?.querySelector('.text-red-500')
      expect(redDot).toBeInTheDocument()
      expect(redDot).toHaveTextContent('●')
    })
  })

  it('should fetch availability when month changes', async () => {
    const { reservationService } = require('@/lib/reservationService')

    await act(async () => {
      render(<Calendar onSelect={mockOnSelect} selected={mockSelected} />)
    })

    await waitFor(() => {
      expect(reservationService.getMonthAvailability).toHaveBeenCalledWith(2025, 6) // July is month 6 (0-indexed)
    })

    await waitFor(() => {
      expect(screen.getByText('2025年7月')).toBeInTheDocument()
    })

    // Clear the mock calls
    reservationService.getMonthAvailability.mockClear()

    // Navigate to next month
    const navButtons = document.querySelectorAll('.flex.justify-between.items-center.mb-4 button')
    const nextButton = navButtons[1] // The second button in the navigation header

    await act(async () => {
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(reservationService.getMonthAvailability).toHaveBeenCalledWith(2025, 7) // August
    })
  })
})
