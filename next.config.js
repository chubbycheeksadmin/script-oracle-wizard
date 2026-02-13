/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure API routes work properly in serverless environment
  serverExternalPackages: ['pdfjs-dist'],
}

module.exports = nextConfig
