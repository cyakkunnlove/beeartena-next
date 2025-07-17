'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Instagram機能は実装しないため、デモギャラリーを表示
const demoImages = [
  { id: 1, src: '/images/2D.jpg', caption: 'パウダーブロウの施術例' },
  { id: 2, src: '/images/3D.jpg', caption: 'フェザーブロウの施術例' },
  { id: 3, src: '/images/4D.jpg', caption: 'パウダー&フェザーの施術例' },
  { id: 4, src: '/images/topimageafter.png', caption: '自然な仕上がり' },
  { id: 5, src: '/images/2D.jpg', caption: '美しい眉ライン' },
  { id: 6, src: '/images/3D.jpg', caption: '立体的な仕上がり' },
];

export default function GallerySection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title">症例ギャラリー</h2>
        <p className="section-subtitle">実際の施術例をご覧ください</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {demoImages.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg shadow-lg">
              <Image
                src={image.src}
                alt={image.caption}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center">
                <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center px-4">
                  {image.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

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
      </div>
    </section>
  );
}