import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { motion } from 'framer-motion'
import ServiceSelection from '@/components/reservation/ServiceSelection'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, initial, animate, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, variants, whileHover, whileTap, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
}))

describe('ServiceSelection Component', () => {
  const mockOnSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all service options', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      expect(screen.getByText('2D')).toBeInTheDocument()
      expect(screen.getByText('パウダーブロウ')).toBeInTheDocument()
      expect(screen.getByText('ふんわりパウダー眉')).toBeInTheDocument()

      expect(screen.getByText('3D')).toBeInTheDocument()
      expect(screen.getByText('フェザーブロウ')).toBeInTheDocument()
      expect(screen.getByText('立体的な毛流れ眉')).toBeInTheDocument()

      expect(screen.getByText('4D')).toBeInTheDocument()
      expect(screen.getByText('パウダー&フェザー')).toBeInTheDocument()
      expect(screen.getByText('2D+3Dのいいとこ取り')).toBeInTheDocument()

      // Check prices - there might be multiple elements with the same price
      const prices20k = screen.getAllByText('¥20,000')
      expect(prices20k.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('¥25,000')).toBeInTheDocument()
    })

    it('should display duration for all services', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const durations = screen.getAllByText('約2時間')
      expect(durations).toHaveLength(3)
    })

    it('should display featured badge for 4D service', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      expect(screen.getByText('人気No.1')).toBeInTheDocument()
    })

    it('should apply correct grid layout', () => {
      const { container } = render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const grid = container.firstChild
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-4')
    })
  })

  describe('Selection State', () => {
    it('should highlight selected service', () => {
      const { rerender } = render(<ServiceSelection onSelect={mockOnSelect} selected="2D" />)

      const buttons = screen.getAllByRole('button')
      const selectedButton = buttons.find((btn) => btn.textContent?.includes('2D'))

      expect(selectedButton).toHaveClass('border-primary', 'bg-primary/5')

      // Change selection
      rerender(<ServiceSelection onSelect={mockOnSelect} selected="3D" />)

      const newSelectedButton = buttons.find((btn) => btn.textContent?.includes('3D'))
      expect(newSelectedButton).toHaveClass('border-primary', 'bg-primary/5')
    })

    it('should show selection indicator for selected service', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="4D" />)

      const buttons = screen.getAllByRole('button')
      const selectedButton = buttons.find((btn) => btn.textContent?.includes('4D'))

      // Check for selection indicator (the border div)
      const indicator = selectedButton?.querySelector(
        '.absolute.inset-0.rounded-xl.border-2.border-primary',
      )
      expect(indicator).toBeInTheDocument()
    })

    it('should apply hover styles to non-selected services', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="2D" />)

      const buttons = screen.getAllByRole('button')
      const nonSelectedButton = buttons.find((btn) => btn.textContent?.includes('3D'))

      expect(nonSelectedButton).toHaveClass('hover:border-primary/50')
    })
  })

  describe('User Interactions', () => {
    it('should call onSelect when service is clicked', async () => {
      const user = userEvent.setup()
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')
      const button2D = buttons.find((btn) => btn.textContent?.includes('2D'))

      await user.click(button2D!)

      expect(mockOnSelect).toHaveBeenCalledWith('2D')
      expect(mockOnSelect).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple service selections', async () => {
      const user = userEvent.setup()
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')

      // Click different services
      await user.click(buttons.find((btn) => btn.textContent?.includes('2D'))!)
      expect(mockOnSelect).toHaveBeenCalledWith('2D')

      await user.click(buttons.find((btn) => btn.textContent?.includes('3D'))!)
      expect(mockOnSelect).toHaveBeenCalledWith('3D')

      await user.click(buttons.find((btn) => btn.textContent?.includes('4D'))!)
      expect(mockOnSelect).toHaveBeenCalledWith('4D')

      expect(mockOnSelect).toHaveBeenCalledTimes(3)
    })

    it('should allow re-selection of already selected service', async () => {
      const user = userEvent.setup()
      render(<ServiceSelection onSelect={mockOnSelect} selected="2D" />)

      const button2D = screen.getAllByRole('button').find((btn) => btn.textContent?.includes('2D'))

      await user.click(button2D!)

      expect(mockOnSelect).toHaveBeenCalledWith('2D')
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')

      // Tab to first button
      await user.tab()
      expect(buttons[0]).toHaveFocus()

      // Enter to select
      await user.keyboard('{Enter}')
      expect(mockOnSelect).toHaveBeenCalledWith('2D')

      // Tab to next button
      await user.tab()
      expect(buttons[1]).toHaveFocus()

      // Space to select
      await user.keyboard(' ')
      expect(mockOnSelect).toHaveBeenCalledWith('3D')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button elements', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
        expect(button).toBeEnabled()
      })
    })

    it('should support touch interactions', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('touch-manipulation')
      })
    })

    it('should have proper contrast for selected state', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="2D" />)

      const selectedButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('2D'))

      // Selected button should have visible styling
      expect(selectedButton).toHaveClass('border-primary', 'bg-primary/5')
    })
  })

  describe('Content Display', () => {
    it('should format prices with thousand separators', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      // Component displays prices with yen symbol
      expect(screen.getAllByText('¥20,000')).toHaveLength(2) // 2D and 3D services
      expect(screen.getByText('¥25,000')).toBeInTheDocument() // 4D service
    })

    it('should display all service information', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const services = [
        {
          id: '2D',
          name: 'パウダーブロウ',
          description: 'ふんわりパウダー眉',
          price: '¥20,000',
          duration: '約2時間',
        },
        {
          id: '3D',
          name: 'フェザーブロウ',
          description: '立体的な毛流れ眉',
          price: '¥20,000',
          duration: '約2時間',
        },
        {
          id: '4D',
          name: 'パウダー&フェザー',
          description: '2D+3Dのいいとこ取り',
          price: '¥25,000',
          duration: '約2時間',
        },
      ]

      services.forEach((service) => {
        expect(screen.getByText(service.id)).toBeInTheDocument()
        expect(screen.getByText(service.name)).toBeInTheDocument()
        expect(screen.getByText(service.description)).toBeInTheDocument()
        // Use getAllByText for prices since multiple services have the same price
        const priceElements = screen.getAllByText(service.price)
        expect(priceElements.length).toBeGreaterThan(0)
        expect(screen.getAllByText(service.duration).length).toBeGreaterThan(0)
      })
    })

    it('should only show featured badge on 4D service', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')
      const featuredBadges = screen.getAllByText('人気No.1')

      expect(featuredBadges).toHaveLength(1)

      const button4D = buttons.find((btn) => btn.textContent?.includes('4D'))
      expect(button4D).toContainElement(featuredBadges[0])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty selected prop', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('border-primary', 'bg-primary/5')
      })
    })

    it('should handle invalid selected value', () => {
      render(<ServiceSelection onSelect={mockOnSelect} selected="invalid" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('border-primary', 'bg-primary/5')
      })
    })

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup({ delay: null })
      render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const button = screen.getAllByRole('button')[0]

      // Rapid clicks
      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(mockOnSelect).toHaveBeenCalledTimes(3)
      expect(mockOnSelect).toHaveBeenCalledWith('2D')
    })

    it('should maintain selection after re-render', () => {
      const { rerender } = render(<ServiceSelection onSelect={mockOnSelect} selected="3D" />)

      let selectedButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('3D'))
      expect(selectedButton).toHaveClass('border-primary')

      // Re-render with same props
      rerender(<ServiceSelection onSelect={mockOnSelect} selected="3D" />)

      selectedButton = screen.getAllByRole('button').find((btn) => btn.textContent?.includes('3D'))
      expect(selectedButton).toHaveClass('border-primary')
    })
  })

  describe('Responsive Behavior', () => {
    it('should apply responsive grid classes', () => {
      const { container } = render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      const grid = container.firstChild
      expect(grid).toHaveClass('grid-cols-1') // Mobile
      expect(grid).toHaveClass('md:grid-cols-3') // Desktop
    })

    it('should handle different viewport sizes', () => {
      // This would typically be tested with a library like @testing-library/react-hooks
      // or by mocking window.matchMedia, but the classes are applied regardless
      const { container } = render(<ServiceSelection onSelect={mockOnSelect} selected="" />)

      expect(container.firstChild).toHaveClass('gap-4')
    })
  })
})
