import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SERVER_EXTERNAL_PACKAGES = [
  'firebase-admin',
  '@google-cloud/storage',
  'google-auth-library',
  'farmhash-modern',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid bundling firebase-admin (and its wasm/node: deps) into Next build output.
  // This prevents webpack from trying to parse wasm / node:* imports.
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'graph.instagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'qr-official.line.me',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@/lib/api/cache.server': path.resolve(__dirname, 'lib/api/cache.client.ts'),
      }
      // クライアントサイドでNode.jsモジュールを使用しない
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    if (dev) {
      config.devtool = 'source-map'
    }
    return config
  },
}

export default nextConfig
