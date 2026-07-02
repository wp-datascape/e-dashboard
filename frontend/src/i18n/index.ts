import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// ─── Resources ────────────────────────────────────────────────────────────────
// Setiap namespace (dashboard, rbac, customers, dst) disimpan sebagai file JSON
// terpisah di locales/<lang>/<namespace>.json, digabung otomatis di sini supaya
// tidak ada satu file locale yang membengkak. Pemanggilan t('namespace.key') di
// komponen tidak berubah — hasil merge tetap satu object flat per bahasa.
function mergeNamespaces(modules: Record<string, { default: Record<string, unknown> }>) {
  const merged: Record<string, unknown> = {}
  for (const path in modules) {
    const ns = path.split('/').pop()!.replace('.json', '')
    merged[ns] = modules[path].default
  }
  return merged
}

const enModules = import.meta.glob('./locales/en/*.json', { eager: true }) as Record<string, { default: Record<string, unknown> }>
const idModules = import.meta.glob('./locales/id/*.json', { eager: true }) as Record<string, { default: Record<string, unknown> }>

const en = mergeNamespaces(enModules)
const id = mergeNamespaces(idModules)

const resources = {
  id: { translation: id },
  en: { translation: en },
}

export const SUPPORTED_LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

// ─── Init ─────────────────────────────────────────────────────────────────────
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'id',
    defaultNS: 'translation',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    interpolation: {
      escapeValue: false, // React sudah handle XSS
    },
    detection: {
      // Urutan deteksi: localStorage dulu, lalu browser
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'exec-dashboard-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
