import type { Context } from 'hono'
import { Resend } from 'resend'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { encrypt, decrypt } from '@/utils/crypto'
import { findResendSettings, upsertResendSettings } from './resend-settings.repository'
import { findRecentNotificationsByType } from '@/features/notifications/notifications.repository'
import { sendDigestEmail } from '@/features/notifications/email.service'
import type { UpsertResendSettingsDto } from './resend-settings.schema'
import type { ResendSetting } from '@/db/schema'

const DIGEST_PREVIEW_LIMIT = 10

// Fallback kalau belum ada notifikasi analisis_alert sama sekali di DB (mis. baru
// setup, belum ada penurunan customer terdeteksi) — tetap contoh REALISTIS
// (bukan lorem ipsum) supaya admin bisa lihat layout digest yang sesungguhnya,
// ditandai jelas "(Contoh)" biar tidak dikira alert asli.
const SAMPLE_DIGEST_ITEMS = [
  {
    title: '[Laporan Kuartal] PT Contoh Sejahtera turun performa (Contoh)',
    body: 'vs periode sebelumnya: Revenue -18.4% | vs tahun lalu: Revenue -22.1%, Margin -15.0% — periode 2026-Q2.',
  },
  {
    title: '[Progres Bulanan] CV Contoh Makmur turun performa (Contoh)',
    body: 'vs tahun lalu: Margin -12.7% — progres s.d. tanggal 14, periode 2026-07 (bulan belum tutup).',
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
 * layout/branding yang SUNGGUHAN sebelum toggle is_active dinyalakan. Isi diambil dari
 * notifikasi analisis_alert TERBARU yang sudah ada di DB (data nyata, read-only, TIDAK
 * membuat notifikasi baru) — fallback ke contoh statis kalau belum ada sama sekali. */
export async function sendTestDigestEmail(to: string): Promise<{ success: boolean; message: string }> {
  const settings = await getDecryptedResendSettings()
  if (!settings?.api_key || !settings.sender_email) {
    return { success: false, message: 'API key atau sender email belum diisi' }
  }

  const recent = await findRecentNotificationsByType('analisis_alert', DIGEST_PREVIEW_LIMIT)
  const items = recent.length > 0 ? recent : SAMPLE_DIGEST_ITEMS

  const sent = await sendDigestEmail(to, items, { skipActiveCheck: true })
  if (!sent) {
    return { success: false, message: 'Gagal mengirim contoh laporan — cek log server untuk detail error dari Resend.' }
  }
  return {
    success: true,
    message: recent.length > 0
      ? `Contoh laporan terkirim (${items.length} notifikasi terbaru dari data asli).`
      : `Contoh laporan terkirim (${items.length} item contoh — belum ada notifikasi analisis_alert di database).`,
  }
}
