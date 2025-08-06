/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'playwright-core', 'playwright']
  }
}

module.exports = nextConfig 