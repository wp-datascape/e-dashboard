// Loader konten Markdown Guide - pola PERSIS sama seperti pages/Help/helpContent.ts
// (task029 §37 lanjutan): file .md ditulis normal (mudah dibaca/diedit), dimuat
// saat build via import.meta.glob, diekspos sbg lookup (lang, slug) -> string.
import { normalizeLangCode } from '@/utils/langCode'

const rawFiles = import.meta.glob('../../i18n/locales/*/guides/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const contentByLangAndSlug: Record<string, Record<string, string>> = {}

for (const [path, raw] of Object.entries(rawFiles)) {
  const match = /\/locales\/([a-z]{2})\/guides\/([\w-]+)\.md$/.exec(path)
  if (!match) continue
  const [, lang, slug] = match
  contentByLangAndSlug[lang] ??= {}
  contentByLangAndSlug[lang][slug] = raw
}

// Fallback ke 'id' kalau bahasa aktif belum punya file untuk slug tertentu.
export function getGuideContent(lang: string, slug: string): string {
  const normalized = normalizeLangCode(lang)
  return contentByLangAndSlug[normalized]?.[slug] ?? contentByLangAndSlug.id?.[slug] ?? ''
}
