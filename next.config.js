/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['randomuser.me', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
  },
  // Add this to prevent server-side rendering of problematic modules
  transpilePackages: ['agora-rtc-sdk-ng'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these on the server
      config.externals = [
        ...(config.externals || []),
        'agora-rtc-sdk-ng',
        'agora-access-token',
      ];
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;