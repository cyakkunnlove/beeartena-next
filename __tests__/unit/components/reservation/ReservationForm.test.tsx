import React from 'react'
import { render, fireEvent, screen, act } from '@testing-library/react'
import ReservationForm from '@/components/reservation/ReservationForm'
import { AuthProvider } from '@/lib/auth/AuthContext'
import '@testing-library/jest-dom'

// Mock useAuth
jest.mock('@/lib/auth/AuthContext', () => ({
  ...jest.requireActual('@/lib/auth/AuthContext'),
  useAuth: jest.fn(),
}))

const mockUseAuth = require('@/lib/auth/AuthContext').useAuth

describe('ReservationForm Component', () => {
  const mockOnChange = jest.fn()
  const mockOnSubmit = jest.fn()
  const mockOnPointsUsed = jest.fn()

  const defaultProps = {
    formData: {
      name: '',
      email: '',
      phone: '',
      notes: '',
    },
    onChange: mockOnChange,
    onSubmit: mockOnSubmit,
    isLoggedIn: false,
    servicePrice: 30000,
    onPointsUsed: mockOnPointsUsed,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null })
  })

  it('should render all form fields', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>,
    )

    expect(screen.getByLabelText(/お名前/)).toBeInTheDocument()
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument()
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument()
    expect(screen.getByLabelText(/ご要望・ご質問/)).toBeInTheDocument()
    expect(screen.getByText('予約を確定する')).toBeInTheDocument()
  })

  it('should call onChange when input values change', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>,
    )

    const nameInput = screen.getByLabelText(/お名前/)
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'テスト太郎' } })
    })
    expect(mockOnChange).toHaveBeenCalledWith('name', 'テスト太郎')

    const emailInput = screen.getByLabelText(/メールアドレス/)
    act(() => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    })
    expect(mockOnChange).toHaveBeenCalledWith('email', 'test@example.com')

    const phoneInput = screen.getByLabelText(/電話番号/)
    act(() => {
      fireEvent.change(phoneInput, { target: { value: '090-1234-5678' } })
    })
    expect(mockOnChange).toHaveBeenCalledWith('phone', '090-1234-5678')

    const notesInput = screen.getByLabelText(/ご要望・ご質問/)
    act(() => {
      fireEvent.change(notesInput, { target: { value: 'テストメモ' } })
    })
    expect(mockOnChange).toHaveBeenCalledWith('notes', 'テストメモ')
  })

  it('should display auto-fill message for logged-in users', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>,
    )

    expect(screen.getByText(/会員情報から自動入力されています/)).toBeInTheDocument()
  })

  it('should not display auto-fill message for non-logged-in users', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={false} />
      </AuthProvider>,
    )

    expect(screen.queryByText(/会員情報から自動入力されています/)).not.toBeInTheDocument()
  })

  it('should display point usage section for logged-in users with points', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 1000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>,
    )

    expect(screen.getByText(/ポイントを使用する/)).toBeInTheDocument()
    expect(screen.getByText(/利用可能: 1,000pt/)).toBeInTheDocument()
  })

  it('should handle point usage correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 5000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>,
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    act(() => {
      fireEvent.click(pointCheckbox)
    })

    const pointInput = screen.getByPlaceholderText('0')
    expect(pointInput).toBeInTheDocument()

    act(() => {
      fireEvent.change(pointInput, { target: { value: '1000' } })
    })
    expect(mockOnPointsUsed).toHaveBeenCalledWith(1000)
  })

  it('should limit points to available amount', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 1000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={5000} />
      </AuthProvider>,
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    act(() => {
      fireEvent.click(pointCheckbox)
    })

    const pointInput = screen.getByPlaceholderText('0')
    // Try to use more points than available
    act(() => {
      fireEvent.change(pointInput, { target: { value: '2000' } })
    })

    // Should not call onPointsUsed with invalid amount
    expect(mockOnPointsUsed).not.toHaveBeenCalledWith(2000)
  })

  it('should display total price correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 1000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={30000} />
      </AuthProvider>,
    )

    // Enable points usage to see the price breakdown
    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    act(() => {
      fireEvent.click(pointCheckbox)
    })

    expect(screen.getByText(/サービス料金: ¥30,000/)).toBeInTheDocument()
  })

  it('should display discounted price when points are used', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 5000 },
    })

    const { rerender } = render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={30000} />
      </AuthProvider>,
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    act(() => {
      fireEvent.click(pointCheckbox)
    })

    const pointInput = screen.getByPlaceholderText('0')
    act(() => {
      fireEvent.change(pointInput, { target: { value: '1000' } })
    })

    // Simulate parent component updating after onPointsUsed is called
    rerender(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={30000} />
      </AuthProvider>,
    )

    // Check that callback was called
    expect(mockOnPointsUsed).toHaveBeenCalledWith(1000)
  })

  it('should call onSubmit when form is submitted', () => {
    const filledFormData = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      notes: '',
    }

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} formData={filledFormData} />
      </AuthProvider>,
    )

    // Check the agreement checkbox first
    const agreementCheckbox = screen.getByRole('checkbox', { name: /注意事項を確認し、同意します/ })
    act(() => {
      fireEvent.click(agreementCheckbox)
    })

    const submitButton = screen.getByText('予約を確定する')
    act(() => {
      fireEvent.click(submitButton)
    })

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('should prevent default form submission', () => {
    const { container } = render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>,
    )

    const form = container.querySelector('form')
    if (!form) {
      throw new Error('Form not found')
    }
    const event = new Event('submit', { bubbles: true, cancelable: true })
    const preventDefault = jest.spyOn(event, 'preventDefault')

    act(() => {
      form.dispatchEvent(event)
    })

    expect(preventDefault).toHaveBeenCalled()
  })

  it('should display form data when provided', () => {
    const filledFormData = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      notes: 'テストメモ',
    }

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} formData={filledFormData} />
      </AuthProvider>,
    )

    expect(screen.getByDisplayValue('テスト太郎')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('090-1234-5678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テストメモ')).toBeInTheDocument()
  })
})
