import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/login/page'
import { useAuth } from '@/lib/auth/AuthContext'
import { User } from '@/lib/types'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/auth/AuthContext')
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockLogin = jest.fn()

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
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
    })
  })

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<LoginPage />)

      expect(screen.getByRole('heading', { name: '会員ログイン' })).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    })

    it('should render registration link', () => {
      render(<LoginPage />)

      const registerLink = screen.getByRole('link', { name: '新規登録' })
      expect(registerLink).toBeInTheDocument()
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('should render forgot password link', () => {
      render(<LoginPage />)

      const forgotPasswordLink = screen.getByRole('link', { name: 'パスワードを忘れた方' })
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })

    it('should display demo account information', () => {
      render(<LoginPage />)

      expect(screen.getByText('デモアカウント（顧客）：')).toBeInTheDocument()
      expect(screen.getByText('メール: yamada@example.com')).toBeInTheDocument()
      expect(screen.getByText('パスワード: password123')).toBeInTheDocument()
    })

    it('should display admin account information', () => {
      render(<LoginPage />)

      expect(screen.getByText('管理者アカウント：')).toBeInTheDocument()
      expect(screen.getByText('メール: admin@beeartena.jp')).toBeInTheDocument()
      expect(screen.getByText('パスワード: admin123')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('should update form data on input change', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('should have correct input attributes', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText('メールアドレス')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'example@email.com')

      const passwordInput = screen.getByLabelText('パスワード')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('name', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••')
    })
  })

  describe('Form Submission', () => {
    it('should handle successful login for customer', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(mockCustomerUser)
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'customer@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password123')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('customer@example.com', 'password123')
        expect(mockPush).toHaveBeenCalledWith('/mypage')
      })
    })

    it('should handle successful login for admin', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(mockAdminUser)
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'admin123')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'admin123')
        expect(mockPush).toHaveBeenCalledWith('/admin')
      })
    })

    it('should display error on login failure', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue(new Error('Invalid credentials'))
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'wrong@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display generic error for non-Error objects', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue('Some error')
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument()
      })
    })

    it('should clear error on new submission', async () => {
      const user = userEvent.setup()
      mockLogin
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockCustomerUser)
      
      render(<LoginPage />)

      // First submission - error
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission - success
      await user.clear(screen.getByLabelText('パスワード'))
      await user.type(screen.getByLabelText('パスワード'), 'correctpassword')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
        expect(mockPush).toHaveBeenCalledWith('/mypage')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await user.click(submitButton)

      expect(screen.getByRole('button', { name: 'ログイン中...' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should restore button state after submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(mockCustomerUser)
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        const submitButton = screen.getByRole('button')
        expect(submitButton).toHaveTextContent('ログイン')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should restore button state after error', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue(new Error('Login failed'))
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        const submitButton = screen.getByRole('button')
        expect(submitButton).toHaveTextContent('ログイン')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Validation', () => {
    it('should prevent submission with empty fields', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const form = screen.getByRole('button', { name: 'ログイン' }).closest('form')!
      
      // Simulate form submission
      fireEvent.submit(form)

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should require valid email format', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement
      const passwordInput = screen.getByLabelText('パスワード')

      // Type invalid email
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')

      // Check HTML5 validation
      expect(emailInput.validity.valid).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<LoginPage />)

      const form = screen.getByRole('button', { name: 'ログイン' }).closest('form')
      expect(form).toBeInTheDocument()

      // Check labels are associated with inputs
      const emailLabel = screen.getByText('メールアドレス')
      expect(emailLabel).toHaveAttribute('for', 'email')

      const passwordLabel = screen.getByText('パスワード')
      expect(passwordLabel).toHaveAttribute('for', 'password')
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      // Tab through elements
      await user.tab()
      expect(screen.getByLabelText('メールアドレス')).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText('パスワード')).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: 'パスワードを忘れた方' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'ログイン' })).toHaveFocus()
    })

    it('should submit form on Enter key', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(mockCustomerUser)
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })
  })

  describe('Styling', () => {
    it('should apply correct CSS classes', () => {
      const { container } = render(<LoginPage />)

      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('min-h-[80vh]', 'flex', 'items-center', 'justify-center')

      const form = screen.getByRole('button', { name: 'ログイン' }).closest('form')
      expect(form).toHaveClass('mt-8', 'space-y-6', 'bg-white', 'p-8', 'rounded-xl', 'shadow-lg')

      const heading = screen.getByRole('heading', { name: '会員ログイン' })
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'text-gradient')
    })

    it('should style error message correctly', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue(new Error('エラーメッセージ'))
      
      render(<LoginPage />)

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
      await user.type(screen.getByLabelText('パスワード'), 'password')
      await user.click(screen.getByRole('button', { name: 'ログイン' }))

      await waitFor(() => {
        const errorDiv = screen.getByText('エラーメッセージ')
        expect(errorDiv).toHaveClass('bg-red-50', 'text-red-700', 'p-4', 'rounded-lg', 'text-sm')
      })
    })
  })
})