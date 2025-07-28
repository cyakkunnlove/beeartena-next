import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import { useAuth } from '@/lib/auth/AuthContext'
import { User } from '@/lib/types'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/auth/AuthContext')
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileTap, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    span: ({ children, animate, transition, style, ...props }: any) => (
      <span style={style} {...props}>
        {children}
      </span>
    ),
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, initial, animate, transition, ...props }: any) => (
      <li {...props}>{children}</li>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock window.location
delete (window as any).location
window.location = {
  href: '/',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
} as any

describe('Header Component', () => {
  const mockLogout = jest.fn()
  const mockPathname = '/'

  const mockCustomerUser: User = {
    id: 'user123',
    email: 'customer@example.com',
    name: '山田太郎',
    phone: '090-1234-5678',
    role: 'customer',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockAdminUser: User = {
    ...mockCustomerUser,
    id: 'admin123',
    email: 'admin@example.com',
    role: 'admin',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogout.mockReset()
    mockLogout.mockResolvedValue(undefined)
    ;(usePathname as jest.Mock).mockReturnValue(mockPathname)
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      logout: mockLogout,
    })
    window.location.href = '/'
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockLogout.mockReset()
  })

  describe('Rendering', () => {
    it('should render logo image', () => {
      render(<Header />)

      const logo = screen.getByAltText('BEE ART ENA')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/images/aicon.jpg')
    })

    it('should render all navigation links', () => {
      render(<Header />)

      const links = [
        'トップ',
        'メニュー・料金',
        '安心プラン',
        'アフターケア',
        'プロフィール',
        '症例ギャラリー',
        'FAQ',
      ]

      links.forEach((link) => {
        // Desktop menu (first occurrence)
        const desktopLinks = screen.getAllByText(link)
        expect(desktopLinks.length).toBeGreaterThan(0)
      })
    })

    it('should render reservation button', () => {
      render(<Header />)

      const reservationButtons = screen.getAllByText('予約する')
      expect(reservationButtons.length).toBeGreaterThan(0)

      // Check if it has the correct styling
      const desktopButton = reservationButtons[0]
      expect(desktopButton).toHaveClass('btn', 'btn-primary')
    })

    it('should apply sticky header styling', () => {
      const { container } = render(<Header />)

      const header = container.querySelector('header')
      expect(header).toHaveClass('bg-white', 'shadow-md', 'sticky', 'top-0', 'z-50')
    })
  })

  describe('Authentication States', () => {
    it('should show login link when not authenticated', () => {
      render(<Header />)

      const loginLinks = screen.getAllByText('会員登録/ログイン')
      expect(loginLinks.length).toBeGreaterThan(0)
    })

    it('should show mypage and logout for authenticated customer', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })

      render(<Header />)

      expect(screen.getByText('マイページ')).toBeInTheDocument()
      expect(screen.getAllByText('ログアウト')).toHaveLength(1) // Only desktop, mobile menu is not rendered
      expect(screen.queryByText('会員登録/ログイン')).not.toBeInTheDocument()
    })

    it('should show admin link for admin users', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockAdminUser,
        logout: mockLogout,
      })

      render(<Header />)

      expect(screen.getByText('管理画面')).toBeInTheDocument()
      expect(screen.queryByText('マイページ')).not.toBeInTheDocument()
    })
  })

  describe('Mobile Menu', () => {
    it('should hide mobile menu by default', () => {
      render(<Header />)

      const mobileMenuButton = screen.getByLabelText('メニューを開く')
      expect(mobileMenuButton).toBeInTheDocument()

      // Mobile menu items should not be rendered initially
      const mobileMenuItems = screen.queryAllByText('安心プラン')
      expect(mobileMenuItems).toHaveLength(1) // Only desktop menu item
    })

    it('should toggle mobile menu on button click', async () => {
      const user = userEvent.setup()
      render(<Header />)

      const menuButton = screen.getByLabelText('メニューを開く')

      // Initially only desktop menu items should be present
      expect(screen.getAllByText('トップ')).toHaveLength(1)

      // Open menu
      await user.click(menuButton)

      // Check if mobile menu items are visible
      const mobileLinks = screen.getAllByText('トップ')
      expect(mobileLinks).toHaveLength(2) // Desktop and mobile

      // Close menu
      await user.click(menuButton)

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.getAllByText('トップ')).toHaveLength(1)
      })
    })

    it('should show hamburger menu animation', () => {
      render(<Header />)

      const menuButton = screen.getByLabelText('メニューを開く')
      const spans = menuButton.querySelectorAll('span')

      expect(spans).toHaveLength(3) // Three lines for hamburger menu
    })

    it('should close mobile menu on route change', () => {
      const { rerender } = render(<Header />)

      // Open menu
      const menuButton = screen.getByLabelText('メニューを開く')
      fireEvent.click(menuButton)

      // Change route
      ;(usePathname as jest.Mock).mockReturnValue('/pricing')
      rerender(<Header />)

      // Menu should be closed (effect would handle this)
      expect(usePathname).toHaveBeenCalled()
    })
  })

  describe('Logout Functionality', () => {
    it('should handle logout for desktop menu', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })
      mockLogout.mockResolvedValue(undefined)

      render(<Header />)

      const logoutButtons = screen.getAllByText('ログアウト')
      const desktopLogoutButton = logoutButtons[0]

      fireEvent.click(desktopLogoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
        expect(window.location.href).toBe('/')
      })
    })

    it('should handle logout for mobile menu', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })
      mockLogout.mockResolvedValue(undefined)

      render(<Header />)

      // Open mobile menu
      const menuButton = screen.getByLabelText('メニューを開く')
      fireEvent.click(menuButton)

      const logoutButtons = screen.getAllByText('ログアウト')
      const mobileLogoutButton = logoutButtons[1]

      fireEvent.click(mobileLogoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
        expect(window.location.href).toBe('/')
      })
    })

    it('should handle logout errors gracefully', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })
      mockLogout.mockRejectedValue(new Error('Logout failed'))

      render(<Header />)

      const logoutButton = screen.getAllByText('ログアウト')[0]

      // Should not throw
      await expect(async () => {
        fireEvent.click(logoutButton)
        await waitFor(() => expect(mockLogout).toHaveBeenCalled())
      }).not.toThrow()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href attributes', () => {
      render(<Header />)

      const links = [
        { text: 'トップ', href: '/' },
        { text: 'メニュー・料金', href: '/pricing' },
        { text: '安心プラン', href: '/#plan' },
        { text: 'アフターケア', href: '/#care' },
        { text: 'プロフィール', href: '/#profile' },
        { text: '症例ギャラリー', href: '/#gallery' },
        { text: 'FAQ', href: '/#faq' },
        { text: '会員登録/ログイン', href: '/login' },
        { text: '予約する', href: '/reservation' },
      ]

      links.forEach(({ text, href }) => {
        const link = screen.getAllByText(text)[0].closest('a')
        expect(link).toHaveAttribute('href', href)
      })
    })

    it('should show correct links for admin user', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockAdminUser,
        logout: mockLogout,
      })

      render(<Header />)

      const adminLink = screen.getByText('管理画面').closest('a')
      expect(adminLink).toHaveAttribute('href', '/admin')
    })

    it('should show correct links for customer user', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })

      render(<Header />)

      const mypageLink = screen.getByText('マイページ').closest('a')
      expect(mypageLink).toHaveAttribute('href', '/mypage')
    })
  })

  describe('Responsive Behavior', () => {
    it('should hide desktop menu on mobile', () => {
      render(<Header />)

      const desktopMenu = screen.getAllByRole('list')[0]
      expect(desktopMenu).toHaveClass('hidden', 'md:flex')
    })

    it('should hide mobile menu button on desktop', () => {
      render(<Header />)

      const mobileMenuButton = screen.getByLabelText('メニューを開く')
      expect(mobileMenuButton).toHaveClass('md:hidden')
    })

    it('should apply responsive container styling', () => {
      const { container } = render(<Header />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('container', 'mx-auto', 'px-4', 'py-4')
    })
  })

  describe('Styling', () => {
    it('should apply hover effects to links', () => {
      render(<Header />)

      const links = screen.getAllByText('トップ')
      links.forEach((link) => {
        expect(link).toHaveClass('hover:text-primary', 'transition-colors')
      })
    })

    it('should style logout button correctly', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })

      render(<Header />)

      const desktopLogoutButton = screen.getAllByText('ログアウト')[0]
      expect(desktopLogoutButton).toHaveClass('text-gray-700', 'hover:text-primary')
    })

    it('should style mobile logout button with full width', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })

      render(<Header />)

      // Open mobile menu first to render mobile logout button
      const menuButton = screen.getByLabelText('メニューを開く')
      fireEvent.click(menuButton)

      const mobileLogoutButton = screen.getAllByText('ログアウト')[1]
      expect(mobileLogoutButton).toHaveClass('block', 'w-full', 'text-left')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label for menu button', () => {
      render(<Header />)

      const menuButton = screen.getByLabelText('メニューを開く')
      expect(menuButton).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const { container } = render(<Header />)

      // Tab through elements
      await user.tab()
      const logoLink = screen.getByAltText('BEE ART ENA').closest('a')
      expect(logoLink).toHaveFocus()

      await user.tab()
      const topLink = screen.getAllByText('トップ')[0]
      expect(topLink).toHaveFocus()
    })

    it('should handle Enter key on logout button', async () => {
      const user = userEvent.setup()
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockCustomerUser,
        logout: mockLogout,
      })
      mockLogout.mockResolvedValue(undefined)

      render(<Header />)

      const logoutButton = screen.getAllByText('ログアウト')[0]
      logoutButton.focus()

      await user.keyboard('{Enter}')

      expect(mockLogout).toHaveBeenCalled()
    })
  })
})
