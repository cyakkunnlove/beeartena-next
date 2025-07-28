import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rounded':
        return 'rounded-lg'
      case 'rectangular':
      default:
        return 'rounded'
    }
  }

  const getAnimationStyles = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-shimmer'
      case 'none':
      default:
        return ''
    }
  }

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  }

  return (
    <div
      className={`bg-gray-200 ${getVariantStyles()} ${getAnimationStyles()} ${className}`}
      style={style}
      aria-busy="true"
      aria-label="読み込み中"
    />
  )
}

// Card Skeleton Component
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
    <Skeleton variant="rectangular" height={200} className="mb-4" />
    <Skeleton variant="text" className="mb-2" />
    <Skeleton variant="text" width="60%" className="mb-4" />
    <div className="flex gap-2">
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="text" width="30%" />
    </div>
  </div>
)

// Table Row Skeleton
export const TableRowSkeleton: React.FC = () => (
  <tr>
    <td className="p-4">
      <Skeleton variant="text" />
    </td>
    <td className="p-4">
      <Skeleton variant="text" />
    </td>
    <td className="p-4">
      <Skeleton variant="text" />
    </td>
    <td className="p-4">
      <Skeleton variant="text" width="80%" />
    </td>
  </tr>
)

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border-b">
    <Skeleton variant="circular" width={48} height={48} />
    <div className="flex-1">
      <Skeleton variant="text" className="mb-2" />
      <Skeleton variant="text" width="60%" />
    </div>
  </div>
)

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="flex flex-col items-center">
    <Skeleton variant="circular" width={120} height={120} className="mb-4" />
    <Skeleton variant="text" width={200} className="mb-2" />
    <Skeleton variant="text" width={150} />
  </div>
)

export default Skeleton
