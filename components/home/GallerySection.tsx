'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'

import SlideTransition from '@/components/layout/SlideTransition'

// Instagram機能は実装しないため、デモギャラリーを表示
const demoImages = [
  { id: 1, src: '/images/2D.jpg', caption: 'パウダーブロウの施術例' },
  { id: 2, src: '/images/3D.jpg', caption: 'フェザーブロウの施術例' },
  { id: 3, src: '/images/4D.jpg', caption: 'パウダー&フェザーの施術例' },
  { id: 4, src: '/images/topimageafter.png', caption: '自然な仕上がり' },
  { id: 5, src: '/images/2D.jpg', caption: '美しい眉ライン' },
  { id: 6, src: '/images/3D.jpg', caption: '立体的な仕上がり' },
]

export default function GallerySection() {
  const [mounted, setMounted] = useState(false)
  const [selectedImage, setSelectedImage] = useState<(typeof demoImages)[0] | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (selectedImage && (isLeftSwipe || isRightSwipe)) {
      const currentIndex = demoImages.findIndex((img) => img.id === selectedImage.id)
      if (isLeftSwipe && currentIndex < demoImages.length - 1) {
        setSelectedImage(demoImages[currentIndex + 1])
      } else if (isRightSwipe && currentIndex > 0) {
        setSelectedImage(demoImages[currentIndex - 1])
      }
    }
  }

  if (!mounted) return null

  return (
    <section id="gallery" className="scroll-mt-24 py-20 bg-white">
      <div className="container mx-auto px-4">
        <SlideTransition direction="up">
          <h2 className="section-title">症例ギャラリー</h2>
          <p className="section-subtitle">実際の施術例をご覧ください</p>
        </SlideTransition>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, staggerChildren: 0.1 }}
        >
          {demoImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative aspect-square overflow-hidden rounded-lg shadow-lg cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image.src}
                alt={image.caption}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <p className="absolute bottom-2 left-2 right-2 text-white text-xs md:text-sm">
                  {image.caption}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <SlideTransition direction="up" delay={0.5}>
          <div className="text-center">
            <a
              href="https://instagram.com/beeartena"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Instagramでもっと見る
            </a>
          </div>
        </SlideTransition>
      </div>

      {/* Lightbox for mobile viewing */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setSelectedImage(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <button
              className="absolute top-4 right-4 text-white text-4xl z-10"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>

            <motion.div
              key={selectedImage.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.src}
                alt={selectedImage.caption}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <p className="text-white text-lg text-center">{selectedImage.caption}</p>
                <p className="text-white/60 text-sm text-center mt-2">スワイプで次の画像へ</p>
              </div>
            </motion.div>

            {/* Navigation dots */}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
              {demoImages.map((img) => (
                <button
                  key={img.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    selectedImage.id === img.id ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImage(img)
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
