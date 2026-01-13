/** @type {import('next').NextConfig} */

const repoName = 'face-verify-app'

// Build cho GitHub Pages
// NEXT_PUBLIC_TARGET=gh-pages pnpm build
const isGithubPages = process.env.NEXT_PUBLIC_TARGET === 'gh-pages'

// Build cho Android APK (Capacitor)
// NEXT_PUBLIC_TARGET=android pnpm build
const isNative = process.env.NEXT_PUBLIC_TARGET === 'android'

const withPWA = require('next-pwa')({
  dest: 'public',

  // Chỉ đăng ký Service Worker khi KHÔNG phải native
  register: !isNative,
  skipWaiting: true,

  disable: isNative,

  runtimeCaching: !isNative
    ? [
        {
          // Cho phép cache /models/** trên Web (GitHub Pages)
          urlPattern: /^\/models\/.*$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'face-models',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 ngày
            },
          },
        },
      ]
    : [],
})

module.exports = withPWA({
  reactStrictMode: true,

  output: 'export',

  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',

  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      const fs = require('fs')
      const path = require('path')

      // Copy models folder from public to out during build
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('CopyModels', () => {
            const srcDir = path.join(__dirname, 'public', 'models')
            const destDir = path.join(__dirname, 'out', 'models')

            if (fs.existsSync(srcDir)) {
              if (fs.existsSync(destDir)) {
                fs.rmSync(destDir, { recursive: true, force: true })
              }

              fs.mkdirSync(destDir, { recursive: true })

              const files = fs.readdirSync(srcDir)
              files.forEach(file => {
                const srcFile = path.join(srcDir, file)
                const destFile = path.join(destDir, file)

\\
                fs.copyFileSync(srcFile, destFile)
              })

              console.log(`Models copied: ${files.length} files from public/models to out/models`)
            } else {
              console.warn('Warning: public/models directory not found')
            }
          })
        }
      })
    }
    return config
  },
})
