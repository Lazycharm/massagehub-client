/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  generateBuildId: async () => {
    // Use timestamp to force cache invalidation on every build
    return `build-${Date.now()}`;
  },
  poweredByHeader: false,
}

module.exports = nextConfig
