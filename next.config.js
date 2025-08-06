/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'puppeteer-core', '@sparticuz/chromium-min', 'puppeteer']
  }
}

module.exports = nextConfig 