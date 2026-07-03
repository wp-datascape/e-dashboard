/**
 * scripts/build-prod.ts — Build production bundle (Render)
 *
 * bun build → satu file dist/index.js (semua import ter-inline), lalu
 * dijalankan lewat javascript-obfuscator supaya source asli tidak gampang
 * dibaca oleh siapa pun yang cuma punya akses shell ke server (bukan akses
 * git repo). Lihat docs-v2/shared/deployment.md §2a untuk konteks lengkap.
 *
 * controlFlowFlattening & deadCodeInjection sengaja OFF — bagus untuk
 * frontend (jalan sekali per page load), tapi backend ini dieksekusi ulang
 * di HOT PATH tiap request masuk. Kedua opsi itu dikenal menambah overhead
 * signifikan (bisa 2-10x) tiap kali code path itu dieksekusi, jadi risiko
 * regresi latency-nya tidak sepadan dengan tambahan proteksi yang didapat.
 */

import obfuscator from 'javascript-obfuscator'

const entry = './src/index.ts'
const outdir = './dist'
const outfile = `${outdir}/index.js`

console.log('[build] bundling', entry, '→', outfile)

const result = await Bun.build({
  entrypoints: [entry],
  outdir,
  target: 'bun',
  minify: true,
  sourcemap: 'none',
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  throw new Error('[build] bun build failed')
}

const bundled = await Bun.file(outfile).text()

console.log('[build] obfuscating', outfile)

const obfuscated = obfuscator.obfuscate(bundled, {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 10,
  numbersToExpressions: true,
  simplify: true,
  // OFF — lihat catatan di atas (overhead per-request) dan alasan yang sama
  // dengan frontend (selfDefending/debugProtection sering crash/hang kalau
  // bundle disentuh ulang, dan mempersulit debug production).
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
})

await Bun.write(outfile, obfuscated.getObfuscatedCode())

console.log('[build] done →', outfile)
