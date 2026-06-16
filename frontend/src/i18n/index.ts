import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import id from './locales/id.json'
import en from './locales/en.json'

// ─── Resources ────────────────────────────────────────────────────────────────
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