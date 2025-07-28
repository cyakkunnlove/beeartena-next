import React from 'react'
import { render } from '@/test/utils/render'
import { axe, toHaveNoViolations } from 'jest-axe'
import MobileButton from '@/components/ui/MobileButton'
import TimeSlots from '@/components/reservation/TimeSlots'
import ServiceSelection from '@/components/reservation/ServiceSelection'
import { createMockTimeSlot } from '@/test/utils/mockData'

expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  describe('MobileButton', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <MobileButton onClick={() => {}}>
          Click me
        </MobileButton>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes when disabled', async () => {
      const { container, getByRole } = render(
        <MobileButton onClick={() => {}} disabled>
          Disabled Button
        </MobileButton>
      )
      
      const button = getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support aria-label', async () => {
      const { container, getByLabelText } = render(
        <MobileButton onClick={() => {}} aria-label="Save changes">
          <span aria-hidden="true">💾</span>
        </MobileButton>
      )
      
      expect(getByLabelText('Save changes')).toBeInTheDocument()
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('TimeSlots', () => {
    const mockSlots = [
      createMockTimeSlot({ time: '10:00', available: true }),
      createMockTimeSlot({ time: '11:00', available: false }),
      createMockTimeSlot({ time: '12:00', available: true }),
    ]

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TimeSlots slots={mockSlots} onSelect={() => {}} />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels for time slots', () => {
      const { getByLabelText } = render(
        <TimeSlots slots={mockSlots} onSelect={() => {}} />
      )
      
      expect(getByLabelText('10:00の時間枠を選択')).toBeInTheDocument()
      expect(getByLabelText('11:00 - この時間は予約済みです')).toBeInTheDocument()
    })

    it('should announce selected state', () => {
      const { getByRole } = render(
        <TimeSlots 
          slots={mockSlots} 
          onSelect={() => {}} 
          selectedTime="10:00"
        />
      )
      
      const selectedSlot = getByRole('button', { name: /10:00.*選択中/i })
      expect(selectedSlot).toHaveAttribute('aria-pressed', 'true')
    })

    it('should be keyboard navigable', () => {
      const { getAllByRole } = render(
        <TimeSlots slots={mockSlots} onSelect={() => {}} />
      )
      
      const buttons = getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabindex', '0')
      })
    })
  })

  describe('ServiceSelection', () => {
    const mockServices = [
      { id: '1', name: 'カット', price: 4000, duration: 60 },
      { id: '2', name: 'カラー', price: 8000, duration: 120 },
      { id: '3', name: 'パーマ', price: 10000, duration: 150 },
    ]

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ServiceSelection services={mockServices} onSelect={() => {}} />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should use semantic HTML', () => {
      const { container } = render(
        <ServiceSelection services={mockServices} onSelect={() => {}} />
      )
      
      // Should use list for services
      expect(container.querySelector('ul')).toBeInTheDocument()
      expect(container.querySelectorAll('li')).toHaveLength(3)
    })

    it('should have descriptive labels', () => {
      const { getByRole } = render(
        <ServiceSelection services={mockServices} onSelect={() => {}} />
      )
      
      const cutButton = getByRole('button', { name: /カット.*4,000円.*60分/i })
      expect(cutButton).toBeInTheDocument()
    })
  })

  describe('Form Accessibility', () => {
    it('should have associated labels for form inputs', () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="email">メールアドレス</label>
            <input id="email" type="email" name="email" />
          </div>
          <div>
            <label htmlFor="password">パスワード</label>
            <input id="password" type="password" name="password" />
          </div>
        </form>
      )
      
      const emailInput = container.querySelector('#email')
      const passwordInput = container.querySelector('#password')
      
      expect(emailInput).toHaveAccessibleName('メールアドレス')
      expect(passwordInput).toHaveAccessibleName('パスワード')
    })

    it('should show error messages accessibly', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="email">メールアドレス</label>
            <input 
              id="email" 
              type="email" 
              name="email" 
              aria-invalid="true"
              aria-describedby="email-error"
            />
            <span id="email-error" role="alert">
              有効なメールアドレスを入力してください
            </span>
          </div>
        </form>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
      
      const input = container.querySelector('#email')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
    })
  })

  describe('Navigation Accessibility', () => {
    it('should have skip links', () => {
      const { container } = render(
        <>
          <a href="#main" className="sr-only focus:not-sr-only">
            メインコンテンツへスキップ
          </a>
          <header>{/* Header content */}</header>
          <main id="main">{/* Main content */}</main>
        </>
      )
      
      const skipLink = container.querySelector('a[href="#main"]')
      expect(skipLink).toHaveTextContent('メインコンテンツへスキップ')
    })

    it('should use nav landmark', async () => {
      const { container } = render(
        <nav aria-label="メインナビゲーション">
          <ul>
            <li><a href="/">ホーム</a></li>
            <li><a href="/services">サービス</a></li>
            <li><a href="/reservation">予約</a></li>
          </ul>
        </nav>
      )
      
      const nav = container.querySelector('nav')
      expect(nav).toHaveAttribute('aria-label', 'メインナビゲーション')
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Color Contrast', () => {
    it('should have sufficient color contrast for text', async () => {
      const { container } = render(
        <div>
          <p style={{ color: '#333', backgroundColor: '#fff' }}>
            通常のテキスト
          </p>
          <p style={{ color: '#666', backgroundColor: '#fff', fontSize: '18px' }}>
            大きめのテキスト
          </p>
        </div>
      )
      
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })
  })

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      const { container } = render(
        <div>
          <button className="focus:ring-2 focus:ring-pink-500">
            Button
          </button>
          <a href="#" className="focus:outline focus:outline-2 focus:outline-offset-2">
            Link
          </a>
        </div>
      )
      
      const button = container.querySelector('button')
      const link = container.querySelector('a')
      
      expect(button?.className).toContain('focus:ring')
      expect(link?.className).toContain('focus:outline')
    })
  })
})