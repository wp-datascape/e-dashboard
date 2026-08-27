// Konten Help disimpan sebagai file Markdown biasa (di
// src/i18n/locales/<lang>/help/*.md), bukan dipadatkan jadi satu string
// panjang di dalam JSON, supaya gampang dibaca/diedit langsung sama seperti
// dokumentasi task di docs-v2. Modul ini memuat semua file itu saat build
// lalu mengekspos lookup (lang, slug) -> markdown mentah. Komponen Help tetap
// mengonsumsinya sebagai string biasa lewat MarkdownContent, kontrak datanya
// tidak berubah dari sebelumnya.
const rawFiles = import.meta.glob('../../i18n/locales/*/help/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const contentByLangAndSlug: Record<string, Record<string, string>> = {}

for (const [path, raw] of Object.entries(rawFiles)) {
  const match = /\/locales\/([a-z]{2})\/help\/([\w-]+)\.md$/.exec(path)
  if (!match) continue
  const [, lang, slug] = match
  contentByLangAndSlug[lang] ??= {}
  contentByLangAndSlug[lang][slug] = raw
}

// Fallback ke 'id' kalau bahasa aktif belum punya file untuk slug tertentu.
export function getHelpContent(lang: string, slug: string): string {
  return contentByLangAndSlug[lang]?.[slug] ?? contentByLangAndSlug.id?.[slug] ?? ''
}
