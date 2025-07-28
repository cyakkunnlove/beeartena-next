import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Skeleton from './Skeleton'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  fill?: boolean
  sizes?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  fill = false,
  sizes,
  objectFit = 'cover',
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      },
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [priority])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setError(true)
    onError?.()
  }

  // 画像の縦横比を保持するためのスタイル
  const aspectRatioStyle = width && height && !fill ? { aspectRatio: `${width} / ${height}` } : {}

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 text-gray-400 ${className}`}
        style={aspectRatioStyle}
        role="img"
        aria-label={`${alt} - 画像の読み込みに失敗しました`}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">画像を読み込めませんでした</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={imgRef} className={`relative ${className}`} style={aspectRatioStyle}>
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </div>
      )}

      {isInView && (
        <>
          {fill ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              quality={quality}
              priority={priority}
              placeholder={placeholder}
              blurDataURL={blurDataURL}
              onLoad={handleLoad}
              onError={handleError}
              style={{ objectFit }}
              className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
          ) : (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              quality={quality}
              priority={priority}
              placeholder={placeholder}
              blurDataURL={blurDataURL}
              onLoad={handleLoad}
              onError={handleError}
              className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
          )}
        </>
      )}
    </div>
  )
}

// Progressive Image Component for critical images
export const ProgressiveImage: React.FC<LazyImageProps & { lowQualitySrc?: string }> = ({
  lowQualitySrc,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || props.src)
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(!lowQualitySrc)

  useEffect(() => {
    if (!lowQualitySrc) return

    const img = new window.Image()
    img.src = props.src
    img.onload = () => {
      setCurrentSrc(props.src)
      setIsHighQualityLoaded(true)
    }
  }, [props.src, lowQualitySrc])

  return (
    <LazyImage
      {...props}
      src={currentSrc}
      className={`${props.className} ${!isHighQualityLoaded ? 'blur-sm' : ''} transition-all duration-500`}
    />
  )
}

export default LazyImage
