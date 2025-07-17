/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'graph.instagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
    ],
  },
};

export default nextConfig;