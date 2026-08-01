/**
 * email.service.ts — kirim digest email alert Analisis (task016 Fase C §21,
 * direvisi §23 jadi lampiran PDF).
 *
 * SATU email per recipient per run scheduler, isi SEMUA notifikasi yang
 * dibuat run itu (lintas company/period type/checkpoint) — keputusan user:
 * "1 email berisi all notifikasi", "semua trigger" (mid_month s/d annual).
 * Badan email HANYA paragraf singkat (permintaan user 2026-07-31: "body email
 * buatkan paragraf saja penjelasan email ini dikirim otomatis sebagai
 * peringatan") — detail LENGKAP (tabel PoP/YoY/YTD per customer) ada di
 * lampiran PDF (pdf.service.ts), bukan di HTML lagi.
 *
 * Retry 3x (2s/5s/10s) + logging tiap percobaan — kalau semua gagal, digest
 * TIDAK terkirim tapi tidak melempar error ke caller (dipanggil fire-and-forget
 * dari scheduler, harus tetap defensif seperti insiden startAnalisisAlertScheduler
 * di scheduler.ts — 1 recipient gagal kirim jangan sampai ganggu recipient lain).
 */
import { Resend } from 'resend'
import { logger } from '@/utils/logger'
import { getDecryptedResendSettings } from '@/features/config/resend-settings.service'
import { buildDigestPdf } from './pdf.service'
import type { DigestNotificationItem } from './digest.types'
import { getDict, type Locale } from './i18n'

export type { DigestNotificationItem } from './digest.types'

const RETRY_DELAYS_MS = [2000, 5000, 10000]
const BRAND_COLOR = '#2563EB' // theme/palettes.ts blue.primary.light (DEFAULT_PALETTE) — email tanpa konteks tema user, pakai warna brand statis

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
  <circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" stroke-width="3"/>
  <g transform="translate(50,50) scale(2.15)" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round">
    <g transform="rotate(0) translate(-12,-21.35)"><path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z"/></g>
    <g transform="rotate(90) translate(-12,-21.35)"><path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z"/></g>
    <g transform="rotate(180) translate(-12,-21.35)"><path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z"/></g>
    <g transform="rotate(270) translate(-12,-21.35)"><path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z"/></g>
  </g>
</svg>`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Badan email cuma paragraf penjelasan singkat — detail lengkap ada di PDF terlampir. */
function buildDigestHtml(items: DigestNotificationItem[], appBaseUrl: string | null, locale: Locale): string {
  const dict = getDict(locale)
  const customerCount = new Set(items.map(i => `${i.company_name}:${i.customer_name}`)).size
  const generatedAt = new Date().toLocaleString(dict.dateLocale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  })

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#F3F4F6;">
      <div style="background:${BRAND_COLOR};padding:28px 24px;text-align:center;">
        ${LOGO_SVG}
        <div style="color:#FFFFFF;font-weight:700;font-size:16px;margin-top:10px;">${dict.pdf.brandName}</div>
      </div>
      <div style="padding:24px;background:#FFFFFF;">
        <h2 style="margin:0 0 12px;color:#111827;font-size:18px;">${dict.email.bodyTitle}</h2>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
          ${dict.email.bodyParagraph(customerCount)}
        </p>
      </div>
      <div style="padding:16px 24px;background:#F9FAFB;color:#9CA3AF;font-size:11px;text-align:center;border-top:1px solid #E5E7EB;">
        ${appBaseUrl ? `<div>${dict.email.footerSource}: <a href="${escapeHtml(appBaseUrl)}" style="color:${BRAND_COLOR};">${escapeHtml(appBaseUrl)}</a></div>` : ''}
        <div style="margin-top:4px;">${dict.email.footerGeneratedAt} ${escapeHtml(generatedAt)} WIB</div>
      </div>
    </div>
  </body>
</html>`
}

/** Kirim SATU digest email (+ lampiran PDF) ke satu recipient. Dipanggil per-user
 * dari scheduler setelah 1 run evaluasi selesai — lihat runAnalisisAlertEvaluation
 * di scheduler.ts. Return boolean (bukan throw) SENGAJA — caller fire-and-forget
 * (scheduler) boleh abaikan return value-nya, tapi caller yang butuh tahu hasil
 * kirim (mis. tombol "kirim contoh laporan" di resend-settings.service.ts) bisa
 * cek. Semua error tetap ditelan+di-log di sini, TIDAK PERNAH throw — jaga kontrak
 * lama tetap aman fire-and-forget.
 *
 * `skipActiveCheck` cuma dipakai jalur test/preview admin (sendTestDigestEmail) —
 * supaya admin bisa lihat hasil digest SEBELUM toggle is_active dinyalakan, tanpa
 * ngubah semantik is_active sebagai kill-switch pengiriman alert asli. */
export async function sendDigestEmail(
  to: string,
  items: DigestNotificationItem[],
  opts?: { skipActiveCheck?: boolean; locale?: Locale },
): Promise<boolean> {
  if (items.length === 0) return false

  const settings = await getDecryptedResendSettings()
  if (!settings?.api_key || !settings.sender_email || (!opts?.skipActiveCheck && !settings.is_active)) {
    logger.info('[email-digest] Resend belum dikonfigurasi/nonaktif, skip', { to, count: items.length })
    return false
  }

  const locale = opts?.locale ?? 'id'
  const dict = getDict(locale)
  const resend = new Resend(settings.api_key)
  const from = settings.sender_name_default
    ? `${settings.sender_name_default} <${settings.sender_email}>`
    : settings.sender_email
  const subject = dict.email.subject(items.length)
  const html = buildDigestHtml(items, settings.app_base_url, locale)
  const pdfBuffer = buildDigestPdf(items, settings.app_base_url, locale)
  const today = new Date().toISOString().split('T')[0]

  const maxAttempts = RETRY_DELAYS_MS.length + 1
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        attachments: [{ content: pdfBuffer, filename: `laporan-alert-analisis-${today}.pdf` }],
      })
      if (error) throw new Error(error.message)
      logger.info('[email-digest] Terkirim', { to, count: items.length, attempt })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('[email-digest] Percobaan gagal', { to, attempt, maxAttempts, error: message })
      if (attempt < maxAttempts) {
        await sleep(RETRY_DELAYS_MS[attempt - 1])
      } else {
        logger.error('[email-digest] Semua percobaan gagal, digest TIDAK terkirim', { to, count: items.length })
      }
    }
  }
  return false
}
