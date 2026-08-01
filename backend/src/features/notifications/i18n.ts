/**
 * i18n.ts — dictionary bahasa utk email digest + PDF alert Analisis (task016
 * §30). Backend TIDAK pakai i18next (itu runtime frontend, butuh browser/
 * React) — modul ringan ini reuse POLA yang sama (key-based, per-locale)
 * supaya bahasa email/PDF ikut preferensi user, bukan hardcode Indonesia terus.
 *
 * Sumber locale:
 * - Digest OTOMATIS (scheduler.ts) → `users.preferences.language` milik
 *   RECIPIENT (bukan admin yang setup Resend) — tiap recipient bisa dapat
 *   email dalam bahasa masing-masing.
 * - Digest MANUAL/test (resend-settings.handler.ts) → dikirim eksplisit dari
 *   frontend (current UI language i18next), karena `to` bisa alamat mana pun
 *   (tidak selalu terhubung ke 1 baris `users`).
 * - Fallback SELALU 'id' (sama dgn frontend/src/i18n/index.ts fallbackLng).
 */
import type { DigestPeriodType, DigestCheckpoint } from './digest.types'

export type Locale = 'id' | 'en'

export function resolveLocale(raw: string | null | undefined): Locale {
  return raw === 'en' ? 'en' : 'id'
}

interface NotificationDict {
  dateLocale: string
  monthNames: string[]
  periodType: Record<DigestPeriodType, string>
  triggerMidMonth: string
  triggerManualSuffix: (periodLabel: string) => string
  triggerReport: (periodLabel: string) => string
  pdf: {
    brandName: string
    sectionYoY: string
    company: string
    customer: string
    comparison: string
    period: string
    changeValue: string
    changePercent: string
    status: string
    statusCritical: string
    statusNormal: string
    newBusiness: string
    generatedOn: string
    page: string
    pareto: string
    unitMillion: string
    unitBillion: string
    comparisonCaption: string
    periodCaption: string
  }
  email: {
    subject: (count: number) => string
    bodyTitle: string
    bodyParagraph: (count: number) => string
    footerSource: string
    footerGeneratedAt: string
    testSubject: string
    testBody: string
  }
}

const DICT: Record<Locale, NotificationDict> = {
  id: {
    dateLocale: 'id-ID',
    monthNames: [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ],
    periodType: {
      monthly: 'Bulanan',
      quarter: 'Kuartalan',
      semester: 'Semesteran',
      ytd: 'Akumulasi (YTD)',
      annual: 'Tahunan',
    },
    triggerMidMonth: 'Laporan Minggu ke-2',
    triggerManualSuffix: (periodLabel) => `${periodLabel} (Manual)`,
    triggerReport: (periodLabel) => `Laporan ${periodLabel}`,
    pdf: {
      brandName: 'Executive Dashboard',
      sectionYoY: 'Tahun ke Tahun (YoY)',
      company: 'Perusahaan',
      customer: 'Customer',
      comparison: 'Pembanding',
      period: 'Periode',
      changeValue: 'Perubahan Nilai',
      changePercent: 'Perubahan (%)',
      status: 'Status',
      statusCritical: 'Kritis',
      statusNormal: 'Normal',
      newBusiness: 'Baru',
      generatedOn: 'Digenerate pada',
      page: 'Halaman',
      pareto: 'Pareto',
      unitMillion: 'jt',
      unitBillion: 'M',
      comparisonCaption: 'Pembanding',
      periodCaption: 'Periode',
    },
    email: {
      subject: (count) => `[Executive Dashboard] ${count} Alert Analisis Customer`,
      bodyTitle: 'Peringatan Performa Customer',
      bodyParagraph: (count) =>
        `Email ini dikirim otomatis oleh sistem Executive Dashboard sebagai peringatan atas penurunan performa ` +
        `(revenue dan/atau margin) pada ${count} customer, dibandingkan periode yang sama tahun lalu. Rincian ` +
        `lengkap per customer tersedia pada lampiran PDF pada email ini.`,
      footerSource: 'Sumber',
      footerGeneratedAt: 'Dibuat otomatis',
      testSubject: 'Test Email — Executive Dashboard',
      testBody: 'Ini email test dari konfigurasi Resend Executive Dashboard. Kalau Anda menerima ini, konfigurasi sudah benar.',
    },
  },
  en: {
    dateLocale: 'en-US',
    monthNames: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    periodType: {
      monthly: 'Monthly',
      quarter: 'Quarterly',
      semester: 'Semester',
      ytd: 'YTD Accumulation',
      annual: 'Annual',
    },
    triggerMidMonth: 'Week 2 Report',
    triggerManualSuffix: (periodLabel) => `${periodLabel} (Manual)`,
    triggerReport: (periodLabel) => `${periodLabel} Report`,
    pdf: {
      brandName: 'Executive Dashboard',
      sectionYoY: 'Year-over-Year (YoY)',
      company: 'Company',
      customer: 'Customer',
      comparison: 'Comparison',
      period: 'Period',
      changeValue: 'Change Value',
      changePercent: 'Change (%)',
      status: 'Status',
      statusCritical: 'Critical',
      statusNormal: 'Normal',
      newBusiness: 'New',
      generatedOn: 'Generated on',
      page: 'Page',
      pareto: 'Pareto',
      unitMillion: 'M',
      unitBillion: 'B',
      comparisonCaption: 'Comparison',
      periodCaption: 'Period',
    },
    email: {
      subject: (count) => `[Executive Dashboard] ${count} Customer Analysis Alert${count === 1 ? '' : 's'}`,
      bodyTitle: 'Customer Performance Alert',
      bodyParagraph: (count) =>
        `This email was sent automatically by the Executive Dashboard system as an alert for performance decline ` +
        `(revenue and/or margin) on ${count} customer${count === 1 ? '' : 's'}, compared to the same period last year. ` +
        `Full details per customer are available in the attached PDF.`,
      footerSource: 'Source',
      footerGeneratedAt: 'Automatically generated',
      testSubject: 'Test Email — Executive Dashboard',
      testBody: 'This is a test email from the Executive Dashboard Resend configuration. If you receive this, the configuration is correct.',
    },
  },
}

export function getDict(locale: Locale): NotificationDict {
  return DICT[locale]
}

/** Label trigger lengkap (mis. "Laporan Kuartalan", "Laporan Minggu ke-2",
 * "Bulanan (Manual)") — dipakai judul notifikasi in-app (scheduler.ts, SELALU
 * locale 'id' — notifikasi in-app belum ada konsep multi-bahasa) MAUPUN PDF/
 * email digest (locale ikut recipient/UI). */
export function triggerLabel(periodType: DigestPeriodType, checkpoint: DigestCheckpoint, locale: Locale = 'id'): string {
  const dict = getDict(locale)
  const periodLabel = dict.periodType[periodType]
  if (checkpoint === 'manual') return dict.triggerManualSuffix(periodLabel)
  if (checkpoint === 'mid_month') return dict.triggerMidMonth
  return dict.triggerReport(periodLabel)
}
