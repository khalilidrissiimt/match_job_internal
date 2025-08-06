/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'puppeteer-core', 'chrome-aws-lambda', 'puppeteer']
  }
}

module.exports = nextConfig 