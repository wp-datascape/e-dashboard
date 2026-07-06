/**
 * utils/telegram.ts
 *
 * Alert Telegram untuk aksi sensitif (Task002 Task E) — dikirim di titik yang sama
 * tempat logAudit() dipanggil untuk aksi-aksi berisiko tinggi (privilege escalation,
 * hapus akun berwenang tinggi, reset password admin/superadmin, unlock manual), plus
 * jalur terpisah untuk account lockout (terjadi sebelum autentikasi berhasil).
 *
 * Konfigurasi via ENV (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) — optional, kalau tidak
 * diisi fungsi ini no-op diam-diam (tidak crash aplikasi, tidak wajib di semua env).
 *
 * DILARANG: throw error dari sini — kegagalan kirim alert TIDAK BOLEH menggagalkan
 * operasi utama (mirip prinsip logAudit()).
 */

import { env } from '@/config/env'
import { logger } from '@/utils/logger'

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    if (!res.ok) {
      logger.error('[telegram] Failed to send alert', { status: res.status, body: await res.text() })
    }
  } catch (err) {
    logger.error('[telegram] Failed to send alert', { err })
  }
}
