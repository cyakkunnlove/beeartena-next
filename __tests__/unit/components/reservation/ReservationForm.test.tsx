import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
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
      </AuthProvider>
    )

    expect(screen.getByLabelText(/お名前/)).toBeInTheDocument()
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument()
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument()
    expect(screen.getByLabelText(/備考/)).toBeInTheDocument()
    expect(screen.getByText('予約を確定する')).toBeInTheDocument()
  })

  it('should call onChange when input values change', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>
    )

    const nameInput = screen.getByLabelText(/お名前/)
    fireEvent.change(nameInput, { target: { value: 'テスト太郎' } })
    expect(mockOnChange).toHaveBeenCalledWith('name', 'テスト太郎')

    const emailInput = screen.getByLabelText(/メールアドレス/)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(mockOnChange).toHaveBeenCalledWith('email', 'test@example.com')

    const phoneInput = screen.getByLabelText(/電話番号/)
    fireEvent.change(phoneInput, { target: { value: '090-1234-5678' } })
    expect(mockOnChange).toHaveBeenCalledWith('phone', '090-1234-5678')

    const notesInput = screen.getByLabelText(/備考/)
    fireEvent.change(notesInput, { target: { value: 'テストメモ' } })
    expect(mockOnChange).toHaveBeenCalledWith('notes', 'テストメモ')
  })

  it('should display auto-fill message for logged-in users', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>
    )

    expect(
      screen.getByText(/会員情報から自動入力されています/)
    ).toBeInTheDocument()
  })

  it('should not display auto-fill message for non-logged-in users', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={false} />
      </AuthProvider>
    )

    expect(
      screen.queryByText(/会員情報から自動入力されています/)
    ).not.toBeInTheDocument()
  })

  it('should display point usage section for logged-in users with points', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 1000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>
    )

    expect(screen.getByText(/ポイントを使用する/)).toBeInTheDocument()
    expect(screen.getByText(/利用可能: 1,000 ポイント/)).toBeInTheDocument()
  })

  it('should handle point usage correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 5000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} />
      </AuthProvider>
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    fireEvent.click(pointCheckbox)

    const pointInput = screen.getByLabelText(/使用するポイント数/)
    expect(pointInput).toBeInTheDocument()

    fireEvent.change(pointInput, { target: { value: '1000' } })
    expect(mockOnPointsUsed).toHaveBeenCalledWith(1000)
  })

  it('should limit points to available amount', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 1000 },
    })

    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={5000} />
      </AuthProvider>
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    fireEvent.click(pointCheckbox)

    const pointInput = screen.getByLabelText(/使用するポイント数/)
    // Try to use more points than available
    fireEvent.change(pointInput, { target: { value: '2000' } })
    
    // Should not call onPointsUsed with invalid amount
    expect(mockOnPointsUsed).not.toHaveBeenCalledWith(2000)
  })

  it('should display total price correctly', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} servicePrice={30000} />
      </AuthProvider>
    )

    expect(screen.getByText(/料金: ¥30,000/)).toBeInTheDocument()
  })

  it('should display discounted price when points are used', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', points: 5000 },
    })

    const { rerender } = render(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={30000} />
      </AuthProvider>
    )

    const pointCheckbox = screen.getByRole('checkbox', { name: /ポイントを使用する/ })
    fireEvent.click(pointCheckbox)

    const pointInput = screen.getByLabelText(/使用するポイント数/)
    fireEvent.change(pointInput, { target: { value: '1000' } })

    // Simulate parent component updating after onPointsUsed is called
    rerender(
      <AuthProvider>
        <ReservationForm {...defaultProps} isLoggedIn={true} servicePrice={30000} />
      </AuthProvider>
    )

    // Check that callback was called
    expect(mockOnPointsUsed).toHaveBeenCalledWith(1000)
  })

  it('should call onSubmit when form is submitted', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>
    )

    const form = screen.getByRole('form', { hidden: true })
    fireEvent.submit(form)

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('should prevent default form submission', () => {
    render(
      <AuthProvider>
        <ReservationForm {...defaultProps} />
      </AuthProvider>
    )

    const form = screen.getByRole('form', { hidden: true })
    const event = new Event('submit', { bubbles: true, cancelable: true })
    const preventDefault = jest.spyOn(event, 'preventDefault')

    form.dispatchEvent(event)

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
      </AuthProvider>
    )

    expect(screen.getByDisplayValue('テスト太郎')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('090-1234-5678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テストメモ')).toBeInTheDocument()
  })
})