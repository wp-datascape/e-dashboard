/**
 * features/docs/docs.route.ts
 *
 * API Documentation — Swagger UI, di-serve dari spec statis (src/docs/openapi.yaml),
 * TANPA library auto-generate (hono-openapi/zod-openapi) — spec ditulis manual.
 *
 * Kenapa manual, bukan auto-generate dari Zod schema:
 * lihat catatan di src/docs/openapi.yaml. Auto-generate sempat dicoba, ada masalah
 * peer-dependency (zod-openapi butuh versi spesifik) dan urutan module-loading yang
 * rapuh — spec statis jauh lebih sederhana dan tidak punya risiko itu.
 *
 * Route ini DI-MOUNT DI DALAM protectedApi (lihat router.ts) — wajib login (access_token
 * cookie valid) untuk mengakses. "Try it out" di Swagger UI memakai cookie & CSRF token
 * ASLI dari login sungguhan (bukan token palsu/bypass) — requestInterceptor di bawah
 * cuma baca cookie csrf_token yang sudah ada lalu pasang ke header X-CSRF-Token.
 */

import { Hono } from 'hono'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export const docsRoutes = new Hono()

const __dirname = dirname(fileURLToPath(import.meta.url))
const specPath = join(__dirname, '../../docs/openapi.yaml')

function swaggerUiDir(): string {
  // swagger-ui-dist expose absolute-path.js yang return folder asset build-nya
  const absolutePath = require('swagger-ui-dist/absolute-path.js') as () => string
  return absolutePath()
}

// ─── Spec (raw YAML, Swagger UI parse sendiri di browser) ─────────────────────
docsRoutes.get('/openapi.yaml', async (c) => {
  const file = Bun.file(specPath)
  if (!(await file.exists())) return c.notFound()
  return new Response(file, {
    headers: { 'Content-Type': 'application/yaml', 'Cache-Control': 'no-store' },
  })
})

// ─── Swagger UI assets (JS/CSS bawaan swagger-ui-dist) ─────────────────────────
docsRoutes.get('/assets/:file', async (c) => {
  const filename = c.req.param('file')
  // cegah path traversal — hanya nama file datar yang diizinkan
  if (filename.includes('/') || filename.includes('..')) return c.notFound()
  const filePath = join(swaggerUiDir(), filename)
  const file = Bun.file(filePath)
  if (!(await file.exists())) return c.notFound()
  return new Response(file)
})

// ─── Halaman utama Swagger UI ───────────────────────────────────────────────────
// Cache-Control: no-store — ini halaman protected, jangan sampai browser masih
// nampilin halaman dari cache setelah user logout (auth sudah di-cek server-side
// tiap request, tapi kalau browser skip request-nya karena cache, pengecekan itu
// nggak pernah kejalan).
docsRoutes.get('/', (c) => {
  c.header('Cache-Control', 'no-store')
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>Executive Dashboard API Docs</title>
  <link rel="stylesheet" href="/api/v1/docs/assets/swagger-ui.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/v1/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    function readCookie(name) {
      const match = document.cookie.match('(^|;)\\\\s*' + name + '\\\\s*=\\\\s*([^;]+)')
      return match ? decodeURIComponent(match.pop()) : null
    }

    window.ui = SwaggerUIBundle({
      url: '/api/v1/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      // Pakai cookie asli dari login sungguhan — bukan token palsu/hardcode.
      // Cookie access_token dikirim otomatis oleh browser (httpOnly), csrf_token
      // dibaca manual di sini karena memang sengaja non-httpOnly (readable JS)
      // supaya bisa dipasang ke header X-CSRF-Token pada request mutasi.
      requestInterceptor: (req) => {
        const csrf = readCookie('csrf_token')
        if (csrf) req.headers['X-CSRF-Token'] = csrf
        req.credentials = 'include'
        return req
      },
    })
  </script>
</body>
</html>`)
})
