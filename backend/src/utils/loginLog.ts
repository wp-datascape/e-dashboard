import { db } from '@/config/db'
import { loginLogs } from '@/db/schema'
import { logger } from '@/utils/logger'

export interface LoginLogOptions {
  userId: number | null
  email?: string | null
  event: 'login_success' | 'login_failed' | 'logout' | 'password_changed' | 'role_changed' | 'account_locked'
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Tulis 1 baris ke login_logs — dipanggil dari auth.service.ts (login/logout/
 * lockout) dan user.service.ts (password reset/ganti role). Terima ip/user-agent
 * sebagai parameter eksplisit (bukan Context) karena loginService() sendiri
 * cuma menerima (dto, ipAddress) — bukan Context Hono. Gagal insert tidak boleh
 * menggagalkan alur login/mutasi utama.
 */
export async function logLoginEvent(opts: LoginLogOptions) {
  const values = {
    user_id: opts.userId,
    email: opts.email ?? null,
    event: opts.event,
    reason: opts.reason ?? null,
    ip_address: opts.ipAddress ?? null,
    user_agent: opts.userAgent ?? null,
  }

  try {
    await db.insert(loginLogs).values(values)
  } catch (err) {
    logger.error('[login-log] Failed to write login log', { error: err instanceof Error ? err.message : err })
  }
}
