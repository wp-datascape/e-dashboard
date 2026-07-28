import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'
import obfuscator from 'vite-plugin-bundle-obfuscator'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    VitePWA({
      // devOptions tetap off (default) — di dev, mock service worker (MSW) yang
      // pegang scope '/'; daftarin dua SW sekaligus di scope sama akan rebutan.
      // SW ini cuma dibuild & didaftarkan di production.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Executive Dashboard',
        short_name: 'E-Dashboard',
        description: 'Business stats dashboard for holding company',
        // Sengaja "/", BUKAN "/dashboard" — /dashboard cuma ada sebagai route dinamis
        // yang di-generate dari pageSettings (App.tsx), dan pageSettings di-disable
        // saat belum login (enabled: !!token). Buka PWA tanpa token -> tabel route
        // kosong -> /dashboard 404 ke NotFound. "/" sudah handle redirect yang benar
        // (isAuthenticated ? /dashboard : /login).
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0f',
        theme_color: '#863bff',
        orientation: 'any',
        lang: 'id',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache JS/CSS/gambar - aman cache-first karena semua sudah content-hashed
        // (tiap build dapat URL baru, versi lama otomatis tidak pernah diminta lagi).
        // html SENGAJA dikeluarkan dari precache - kalau ikut di-precache, dia dilayani
        // cache-first oleh SW dan baru ke-update di background pas ada deploy baru,
        // jadi siapa pun yang sudah pernah buka app ini bisa nyangkut lihat versi lama
        // (index.html nentuin bundle JS/CSS mana yang dipakai) berhari-hari sampai ada
        // trigger update - kejadian nyata: footer & halaman login yang sudah dideploy
        // baru masih tampil versi lama di browser orang lain. Ganti pakai runtimeCaching
        // NetworkFirst di bawah - setiap navigasi coba jaringan dulu (selalu versi
        // terbaru selama online), baru fallback ke cache kalau offline/network timeout.
        globPatterns: ['**/*.{js,css,svg,png,woff2}'],
        // vite-plugin-pwa default-nya diam-diam set navigateFallback: 'index.html'
        // kalau tidak di-override (lihat defaultWorkbox di node_modules/vite-plugin-pwa) -
        // itu registrasi NavigationRoute cache-first TERPISAH yang otomatis nempel duluan
        // di depan runtimeCaching di bawah (Workbox match berdasar urutan registrasi,
        // yang pertama cocok menang), jadi kalau dibiarkan, NetworkFirst di bawah tidak
        // akan pernah kepanggil buat request navigasi. Wajib di-null-kan eksplisit di sini.
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-shell',
              networkTimeoutSeconds: 3,
            },
          },
        ],
        // Default limit Workbox 2 MiB — chunk CustomerMetrics (recharts+html2canvas+jspdf) ~2.6MB
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
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
    // usePolling: inotify-based watch (default) kadang gagal detect save dari editor
    // yang nulis pakai atomic write/rename (ganti inode, bukan in-place write) - efeknya
    // module graph Vite stale sampai ada file LAIN di dependency chain yang ke-save,
    // baru ke-refresh bareng. Polling lebih berat CPU tapi selalu detect perubahan
    // apapun cara editornya nyimpen. Dev-only, tidak pengaruh ke build production.
    watch: { usePolling: true, interval: 300 },
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
