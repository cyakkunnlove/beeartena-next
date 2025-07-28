import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'

interface ValidationRule {
  test: (value: string) => boolean
  message: string
}

interface FormFieldProps {
  id: string
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'password' | 'textarea' | 'select'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validationRules?: ValidationRule[]
  options?: { value: string; label: string }[]
  rows?: number
  autoComplete?: string
  showSuccess?: boolean
  validateOnChange?: boolean
  className?: string
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  validationRules = [],
  options = [],
  rows = 4,
  autoComplete,
  showSuccess = true,
  validateOnChange = false,
  className = '',
}) => {
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // デフォルトのバリデーションルール
  const defaultRules: Record<string, ValidationRule[]> = {
    email: [
      {
        test: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        message: '有効なメールアドレスを入力してください',
      },
    ],
    tel: [
      {
        test: (val) => /^[\d-+()]+$/.test(val.replace(/\s/g, '')),
        message: '有効な電話番号を入力してください',
      },
    ],
    password: [
      {
        test: (val) => val.length >= 8,
        message: 'パスワードは8文字以上で入力してください',
      },
      {
        test: (val) => /[A-Z]/.test(val),
        message: 'パスワードには大文字を含めてください',
      },
      {
        test: (val) => /[a-z]/.test(val),
        message: 'パスワードには小文字を含めてください',
      },
      {
        test: (val) => /[0-9]/.test(val),
        message: 'パスワードには数字を含めてください',
      },
    ],
  }

  const rules = [...(defaultRules[type] || []), ...validationRules]

  const validate = (val: string) => {
    if (required && !val.trim()) {
      setError(`${label}は必須項目です`)
      setIsValid(false)
      return false
    }

    for (const rule of rules) {
      if (!rule.test(val)) {
        setError(rule.message)
        setIsValid(false)
        return false
      }
    }

    setError('')
    setIsValid(true)
    return true
  }

  useEffect(() => {
    if (touched && (validateOnChange || error)) {
      validate(value)
    }
  }, [value, touched])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    onChange(e.target.value)
  }

  const handleBlur = () => {
    setTouched(true)
    validate(value)
    onBlur?.()
  }

  const getFieldStyles = () => {
    const baseStyles =
      'w-full px-4 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:outline-none'

    if (error && touched) {
      return `${baseStyles} border-red-500 focus:ring-red-200 focus:border-red-500`
    }

    if (isValid && showSuccess && touched && value) {
      return `${baseStyles} border-green-500 focus:ring-green-200 focus:border-green-500`
    }

    return `${baseStyles} border-gray-300 focus:ring-primary/20 focus:border-primary`
  }

  const renderField = () => {
    const fieldProps = {
      id,
      name,
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      placeholder,
      disabled,
      autoComplete,
      className: getFieldStyles(),
      'aria-invalid': (error && touched) as boolean,
      'aria-describedby': error && touched ? `${id}-error` : undefined,
      'aria-required': required,
    }

    switch (type) {
      case 'textarea':
        return <textarea {...fieldProps} rows={rows} />

      case 'select':
        return (
          <select {...fieldProps}>
            <option value="">選択してください</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      default:
        return <input {...fieldProps} type={type} />
    }
  }

  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {renderField()}

        {/* Status Icons */}
        {touched && value && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {error ? (
              <ExclamationCircleIcon className="w-5 h-5 text-red-500" aria-hidden="true" />
            ) : isValid && showSuccess ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" aria-hidden="true" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && touched && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Success Message */}
      {isValid && showSuccess && touched && value && !error && (
        <p className="mt-1 text-sm text-green-600" role="status">
          入力内容が有効です
        </p>
      )}
    </div>
  )
}

export default FormField
