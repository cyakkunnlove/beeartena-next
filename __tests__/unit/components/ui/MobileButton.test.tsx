import React from 'react'
import { render, fireEvent, waitFor } from '@/test/utils/render'
import MobileButton from '@/components/ui/MobileButton'
import '@testing-library/jest-dom'

describe('MobileButton', () => {
  it('should render with default props', () => {
    const { getByRole } = render(
      <MobileButton onClick={() => {}}>Click me</MobileButton>
    )
    
    const button = getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
    expect(button).toHaveClass('bg-pink-500')
  })

  it('should render with secondary variant', () => {
    const { getByRole } = render(
      <MobileButton variant="secondary" onClick={() => {}}>
        Secondary
      </MobileButton>
    )
    
    const button = getByRole('button')
    expect(button).toHaveClass('bg-white')
    expect(button).toHaveClass('text-pink-500')
  })

  it('should render with outline variant', () => {
    const { getByRole } = render(
      <MobileButton variant="outline" onClick={() => {}}>
        Outline
      </MobileButton>
    )
    
    const button = getByRole('button')
    expect(button).toHaveClass('border-2')
    expect(button).toHaveClass('border-pink-500')
  })

  it('should handle click events', async () => {
    const handleClick = jest.fn()
    const { getByRole } = render(
      <MobileButton onClick={handleClick}>Click me</MobileButton>
    )
    
    const button = getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  it('should be disabled when disabled prop is true', () => {
    const handleClick = jest.fn()
    const { getByRole } = render(
      <MobileButton onClick={handleClick} disabled>
        Disabled
      </MobileButton>
    )
    
    const button = getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render with full width', () => {
    const { getByRole } = render(
      <MobileButton onClick={() => {}} fullWidth>
        Full Width
      </MobileButton>
    )
    
    const button = getByRole('button')
    expect(button).toHaveClass('w-full')
  })

  it('should render with different sizes', () => {
    const { getByRole: getSmall } = render(
      <MobileButton onClick={() => {}} size="sm">
        Small
      </MobileButton>
    )
    
    const { getByRole: getLarge } = render(
      <MobileButton onClick={() => {}} size="lg">
        Large
      </MobileButton>
    )
    
    expect(getSmall('button')).toHaveClass('text-sm')
    expect(getLarge('button')).toHaveClass('text-lg')
  })

  it('should handle touch events for haptic feedback', () => {
    const { getByRole } = render(
      <MobileButton onClick={() => {}}>Touch me</MobileButton>
    )
    
    const button = getByRole('button')
    
    // Simulate touch start
    fireEvent.touchStart(button)
    expect(button).toHaveClass('scale-95')
    
    // Simulate touch end
    fireEvent.touchEnd(button)
    expect(button).not.toHaveClass('scale-95')
  })
})