import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'
import obfuscator from 'vite-plugin-bundle-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    // Hanya jalan saat build production (apply: 'build') — dev server tetap
    // pakai kode asli biar HMR cepat & error message tetap jelas.
    //
    // vite-plugin-javascript-obfuscator (generic rollup wrapper) dicoba lebih
    // dulu tapi menghancurkan code-splitting — 58 chunk per-halaman jadi cuma
    // 11 file raksasa (semua lazy route ke-bundle jadi satu). Ganti ke
    // vite-plugin-bundle-obfuscator yang eksplisit dukung Vite 8 dan
    // mempertahankan dynamic import/manualChunks.
    //
    // autoExcludeNodeModules: true sempat dicoba juga tapi ternyata mengambil
    // alih strategi chunking vendor sendiri — react-vendor/mui-core/mui-icons/
    // mui-x/recharts/query/i18n (7 chunk terpisah, lihat manualChunks di bawah)
    // malah digabung jadi satu "vendor-modules" 2.4MB. Exclude manual pakai
    // nama chunk sendiri supaya manualChunks di bawah tetap yang menentukan.
    obfuscator({
      apply: 'build',
      log: false,
      excludes: [/react-vendor/, /mui-icons/, /mui-x/, /mui-core/, /recharts/, /^query-/, /^i18n-/, /rolldown-runtime/],
      threadPool: { enable: true, size: 4 },
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.3,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        splitStrings: true,
        splitStringsChunkLength: 10,
        numbersToExpressions: true,
        simplify: true,
        // Sengaja OFF — selfDefending & debugProtection sering bikin crash/hang
        // kalau bundle disentuh CDN/proxy (mis. minify ulang, byte-range request),
        // dan bikin tim sendiri tidak bisa debug isu production lewat DevTools.
        selfDefending: false,
        debugProtection: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@mui/icons-material/')) {
            return 'mui-icons'
          }
          if (id.includes('node_modules/@mui/x-data-grid/') || id.includes('node_modules/@mui/x-date-pickers/')) {
            return 'mui-x'
          }
          if (id.includes('node_modules/@mui/') || id.includes('node_modules/@emotion/')) {
            return 'mui-core'
          }
          if (id.includes('node_modules/recharts/')) {
            return 'recharts'
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'query'
          }
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next/')) {
            return 'i18n'
          }
        },
      },
    },
  },
})
