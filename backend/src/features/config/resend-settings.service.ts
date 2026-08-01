import type { Context } from 'hono'
import { Resend } from 'resend'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { encrypt, decrypt } from '@/utils/crypto'
import { findResendSettings, upsertResendSettings } from './resend-settings.repository'
import { sendDigestEmail } from '@/features/notifications/email.service'
import { type DigestNotificationItem, type MetricComparisonDetail } from '@/features/notifications/digest.types'
import type { UpsertResendSettingsDto } from './resend-settings.schema'
import type { ResendSetting } from '@/db/schema'

function sampleMetric(current: { revenue: number; margin: number }, comparison: { revenue: number; margin: number }): MetricComparisonDetail {
  const revPct = comparison.revenue > 0 ? ((current.revenue - comparison.revenue) / comparison.revenue) * 100 : null
  const marPct = comparison.margin > 0 ? ((current.margin - comparison.margin) / comparison.margin) * 100 : null
  return {
    current,
    comparison,
    revenue_change_value: current.revenue - comparison.revenue,
    margin_change_value: current.margin - comparison.margin,
    revenue_change_pct: revPct,
    margin_change_pct: marPct,
    revenue_alert: revPct !== null && revPct <= -20,
    margin_alert: marPct !== null && marPct <= -20,
  }
}

// Fallback kalau belum ada notifikasi analisis_alert sama sekali di DB (mis. baru
// setup, belum ada penurunan customer terdeteksi) — tetap contoh REALISTIS
// (bukan lorem ipsum) supaya admin bisa lihat layout digest (termasuk PDF)
// yang sesungguhnya, nama customer ditandai jelas "(Contoh)" biar tidak
// dikira alert asli.
const SAMPLE_DIGEST_ITEMS: DigestNotificationItem[] = [
  {
    customer_name: 'PT Contoh Sejahtera (Contoh)',
    company_name: 'PT Mesin Kasir Online',
    is_pareto: true,
    period_type: 'quarter',
    period_key: '2026-Q2',
    checkpoint: 'closed',
    detail: {
      last_year: sampleMetric({ revenue: 20_600_000, margin: 3_600_000 }, { revenue: 26_400_000, margin: 4_600_000 }),
    },
  },
]

// Dipakai fitur lain (notifications/email.service.ts) buat ambil kredensial
// SUDAH TER-DEKRIPSI — jangan expose ini ke handler/frontend langsung
// (lihat getResendSettingsForUI di bawah, yang sengaja MASK api_key).
export async function getDecryptedResendSettings(): Promise<ResendSetting | null> {
  const row = await findResendSettings()
  if (!row) return null
  return { ...row, api_key: row.api_key ? await decrypt(row.api_key) : null }
}

// Dipakai handler GET — api_key di-mask (jangan pernah kirim plaintext
// kredensial balik ke frontend, sama seperti pola Accurate).
export async function getResendSettingsForUI(): Promise<Omit<ResendSetting, 'api_key'> & { has_api_key: boolean }> {
  const row = await findResendSettings()
  if (!row) {
    return {
      id: 0, sender_email: null, sender_name_default: null, app_base_url: null,
      is_active: false, created_at: new Date(), updated_at: new Date(), has_api_key: false,
    }
  }
  const { api_key, ...rest } = row
  return { ...rest, has_api_key: !!api_key }
}

export async function saveResendSettings(dto: UpsertResendSettingsDto, ctx: Context) {
  const data: Record<string, unknown> = {}
  if (dto.sender_email !== undefined) data.sender_email = dto.sender_email || null
  if (dto.sender_name_default !== undefined) data.sender_name_default = dto.sender_name_default || null
  if (dto.app_base_url !== undefined) data.app_base_url = dto.app_base_url || null
  if (dto.is_active !== undefined) data.is_active = dto.is_active
  // api_key cuma di-update kalau dikirim NON-KOSONG — form frontend selalu
  // kirim field ini kosong kalau admin tidak ganti (biar tidak accidental
  // hapus kredensial yang sudah ada cuma karena save field lain).
  if (dto.api_key) data.api_key = await encrypt(dto.api_key)

  const result = await upsertResendSettings(data)

  await logAudit(ctx, {
    action: 'resend_settings.upsert',
    entity: 'resend_settings',
    entityId: result.id,
    companyId: null,
    newValue: { ...dto, api_key: dto.api_key ? '[REDACTED]' : undefined },
  })

  logger.info('[resend-settings] Settings saved', { has_api_key: !!result.api_key, is_active: result.is_active })
  return getResendSettingsForUI()
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
  const settings = await getDecryptedResendSettings()
  if (!settings?.api_key || !settings.sender_email) {
    return { success: false, message: 'API key atau sender email belum diisi' }
  }

  try {
    const resend = new Resend(settings.api_key)
    const from = settings.sender_name_default
      ? `${settings.sender_name_default} <${settings.sender_email}>`
      : settings.sender_email
    const { error } = await resend.emails.send({
      from,
      to,
      subject: 'Test Email — Executive Dashboard',
      html: '<p>Ini email test dari konfigurasi Resend Executive Dashboard. Kalau Anda menerima ini, konfigurasi sudah benar.</p>',
    })
    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Email test berhasil dikirim' }
  } catch (err) {
    logger.error('[resend-settings] Test email failed', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, message: err instanceof Error ? err.message : 'Gagal mengirim email test' }
  }
}

/** Kirim CONTOH digest laporan pakai template asli (email.service.ts sendDigestEmail),
 * bukan pesan generik seperti sendTestEmail di atas — supaya admin bisa lihat hasil
 * layout/branding yang SUNGGUHAN sebelum toggle is_active dinyalakan.
 *
 * `previewItems` dihitung LANGSUNG dari data invoice terkini (LIVE, bukan baca histori
 * tabel `notifications` yang bisa basi/incompatible — lihat previewCurrentDigestItems
 * di scheduler.ts) oleh HANDLER (resend-settings.handler.ts), bukan di sini — supaya
 * tidak circular import (resend-settings.service -> scheduler -> email.service ->
 * resend-settings.service kalau di-import langsung dari sini). Kosong = tidak ada
 * customer Kritis saat ini -> fallback ke contoh statis. */
export async function sendTestDigestEmail(
  to: string,
  previewItems: DigestNotificationItem[],
): Promise<{ success: boolean; message: string }> {
  const settings = await getDecryptedResendSettings()
  if (!settings?.api_key || !settings.sender_email) {
    return { success: false, message: 'API key atau sender email belum diisi' }
  }

  const usingSample = previewItems.length === 0
  const items = usingSample ? SAMPLE_DIGEST_ITEMS : previewItems

  const sent = await sendDigestEmail(to, items, { skipActiveCheck: true })
  if (!sent) {
    return { success: false, message: 'Gagal mengirim contoh laporan — cek log server untuk detail error dari Resend.' }
  }
  return {
    success: true,
    message: usingSample
      ? `Contoh laporan terkirim (${items.length} item contoh — saat ini tidak ada customer berstatus Kritis).`
      : `Contoh laporan terkirim (${items.length} customer Kritis saat ini, dihitung live dari data invoice terkini).`,
  }
}
