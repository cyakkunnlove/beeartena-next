import React from 'react'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  center?: boolean
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = true,
  center = true,
}) => {
  const getMaxWidthClass = () => {
    const widths = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    }
    return widths[maxWidth]
  }

  const containerClasses = [
    'w-full',
    getMaxWidthClass(),
    center && 'mx-auto',
    padding && 'px-4 sm:px-6 lg:px-8',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={containerClasses}>{children}</div>
}

// Responsive Grid Component
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  className?: string
}> = ({ children, columns = { default: 1, sm: 2, lg: 3 }, gap = 6, className = '' }) => {
  const getGridCols = () => {
    const cols = []
    if (columns.default) cols.push(`grid-cols-${columns.default}`)
    if (columns.sm) cols.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) cols.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) cols.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) cols.push(`xl:grid-cols-${columns.xl}`)
    return cols.join(' ')
  }

  return <div className={`grid ${getGridCols()} gap-${gap} ${className}`}>{children}</div>
}

// Responsive Stack Component
export const ResponsiveStack: React.FC<{
  children: React.ReactNode
  direction?: 'vertical' | 'horizontal'
  spacing?: number
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}> = ({ children, direction = 'vertical', spacing = 4, breakpoint = 'md', className = '' }) => {
  const getStackClasses = () => {
    if (direction === 'vertical') {
      return `flex flex-col space-y-${spacing}`
    }

    return `flex flex-col space-y-${spacing} ${breakpoint}:flex-row ${breakpoint}:space-y-0 ${breakpoint}:space-x-${spacing}`
  }

  return <div className={`${getStackClasses()} ${className}`}>{children}</div>
}

// Responsive Text Component
export const ResponsiveText: React.FC<{
  children: React.ReactNode
  size?: {
    default?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }
  weight?: string
  className?: string
  as?: keyof JSX.IntrinsicElements
}> = ({
  children,
  size = { default: 'base', md: 'lg', lg: 'xl' },
  weight = 'normal',
  className = '',
  as: Component = 'p',
}) => {
  const getSizeClasses = () => {
    const sizes = []
    if (size.default) sizes.push(`text-${size.default}`)
    if (size.sm) sizes.push(`sm:text-${size.sm}`)
    if (size.md) sizes.push(`md:text-${size.md}`)
    if (size.lg) sizes.push(`lg:text-${size.lg}`)
    if (size.xl) sizes.push(`xl:text-${size.xl}`)
    return sizes.join(' ')
  }

  return (
    <Component className={`${getSizeClasses()} font-${weight} ${className}`}>{children}</Component>
  )
}

export default ResponsiveContainer
