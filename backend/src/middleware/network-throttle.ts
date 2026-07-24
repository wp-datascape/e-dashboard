/**
 * middleware/network-throttle.ts
 *
 * Simulasi kondisi network lambat (3G/4G) untuk testing — GLOBAL, mempengaruhi
 * SEMUA user yang sedang akses aplikasi KECUALI superadmin (bukan per-browser seperti
 * Chrome DevTools network throttling). Dikontrol dari halaman Access Control > AB
 * Testing (`features/ab-testing/`), disimpan di `business_configs.network_throttle_mode`.
 *
 * PENTING — ini simulasi LATENCY (delay tambahan sebelum response dikirim), BUKAN
 * pembatasan bandwidth/throughput asli. Bandwidth sungguhan (byte/detik) tidak bisa
 * dikontrol dari application code Hono/Bun — itu ranah network layer (reverse proxy/
 * OS/hosting). Delay tambahan ini sudah cukup untuk mensimulasikan PENGALAMAN
 * loading lambat (spinner lama, request menumpuk) yang jadi tujuan testing ini.
 *
 * State di-cache in-memory (bukan query DB tiap request — mode jarang berubah,
 * request masuk terus-menerus). Diperbarui lewat setNetworkThrottleMode() yang
 * dipanggil dari ab-testing.service.ts setiap admin ganti mode.
 */

import type { Context, Next } from 'hono'
import { findConfigByKey } from '@/features/config/config.repository'
import { logger } from '@/utils/logger'

export type NetworkThrottleMode = 'off' | '3g' | '4g' | 'offline'
export type ConfigurableThrottleMode = '3g' | '4g'

const VALID_MODES: NetworkThrottleMode[] = ['off', '3g', '4g', 'offline']
const CONFIGURABLE_MODES: ConfigurableThrottleMode[] = ['3g', '4g']

// Batas wajar delay yang boleh di-set (ms) — cegah admin tidak sengaja set angka
// ekstrem (mis. 0 detik jadi percuma, atau jutaan ms bikin app kelihatan "hang").
export const MIN_THROTTLE_DELAY_MS = 0
export const MAX_THROTTLE_DELAY_MS = 30_000

// Delay tambahan per profil (ms) — default kira-kira selaras dengan preset Chrome
// DevTools ("Slow 3G" RTT ~2000ms, "Fast 4G" RTT ~170ms), disederhanakan jadi angka
// bulat. Sekarang bisa diubah runtime lewat halaman AB Testing (2026-07-24) - nilai
// awal ini cuma fallback sebelum initNetworkThrottleFromDb() jalan / kalau baris
// config belum ada di DB.
const throttleDelayMs: Record<NetworkThrottleMode, number> = {
  off: 0,
  '3g': 1500,
  '4g': 300,
  // 'offline' ditangani khusus (hang, bukan delay biasa) - lihat networkThrottleMiddleware.
  // Angka ini tidak pernah dipakai, cuma placeholder supaya Record<NetworkThrottleMode, ...> lengkap.
  offline: 0,
}

const DELAY_CONFIG_KEY: Record<ConfigurableThrottleMode, string> = {
  '3g': 'network_throttle_delay_3g_ms',
  '4g': 'network_throttle_delay_4g_ms',
}

let currentMode: NetworkThrottleMode = 'off'

export function getNetworkThrottleMode(): NetworkThrottleMode {
  return currentMode
}

export function setNetworkThrottleMode(mode: string): void {
  if (!VALID_MODES.includes(mode as NetworkThrottleMode)) {
    throw new Error(`Invalid network throttle mode: ${mode}`)
  }
  currentMode = mode as NetworkThrottleMode
}

export function getNetworkThrottleDelays(): Record<ConfigurableThrottleMode, number> {
  return { '3g': throttleDelayMs['3g'], '4g': throttleDelayMs['4g'] }
}

export function setNetworkThrottleDelay(mode: ConfigurableThrottleMode, delayMs: number): void {
  if (!CONFIGURABLE_MODES.includes(mode)) {
    throw new Error(`Invalid throttle mode for delay config: ${mode}`)
  }
  if (!Number.isInteger(delayMs) || delayMs < MIN_THROTTLE_DELAY_MS || delayMs > MAX_THROTTLE_DELAY_MS) {
    throw new Error(`Invalid delay value: ${delayMs} (must be integer ${MIN_THROTTLE_DELAY_MS}-${MAX_THROTTLE_DELAY_MS})`)
  }
  throttleDelayMs[mode] = delayMs
}

/**
 * Load nilai persisted dari DB ke cache in-memory saat server start — cache di atas
 * default 'off' + delay bawaan sampai dipanggil, jadi TANPA ini pun aplikasi tetap
 * aman (fail-safe), cuma mode/delay yang di-set sebelum restart tidak ke-restore
 * otomatis. Dipanggil sekali di index.ts, tidak perlu memblokir startup server
 * (fire-and-forget).
 */
export async function initNetworkThrottleFromDb(): Promise<void> {
  try {
    const modeRow = await findConfigByKey('network_throttle_mode')
    if (modeRow && VALID_MODES.includes(modeRow.value as NetworkThrottleMode)) {
      currentMode = modeRow.value as NetworkThrottleMode
    }

    for (const mode of CONFIGURABLE_MODES) {
      const row = await findConfigByKey(DELAY_CONFIG_KEY[mode])
      const parsed = row ? Number(row.value) : NaN
      if (!isNaN(parsed) && Number.isInteger(parsed) && parsed >= MIN_THROTTLE_DELAY_MS && parsed <= MAX_THROTTLE_DELAY_MS) {
        throttleDelayMs[mode] = parsed
      }
    }

    logger.info(`[network-throttle] Restored from DB: mode=${currentMode}, delays=${JSON.stringify(getNetworkThrottleDelays())}`)
  } catch (err) {
    logger.error('[network-throttle] Failed to load from DB, fallback to defaults', { error: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * Dipasang di protectedApi (setelah authMiddleware) — TIDAK di /health atau /auth/*
 * supaya load balancer probe & login tidak ikut ter-delay.
 *
 * Superadmin DIKECUALIKAN dari delay/offline (2026-07-24) — toggle ini dipakai
 * superadmin sendiri untuk lihat bagaimana user LAIN mengalami network lambat/putus,
 * bukan untuk memperlambat/mengunci diri sendiri (termasuk saat mau balik ke halaman
 * AB Testing untuk mematikannya lagi — kalau ikut ke-throttle/offline, jalan
 * satu-satunya keluar cuma restart server manual).
 *
 * Mode 'offline' (2026-07-24): request HANG selamanya (promise tidak pernah resolve,
 * `next()` TIDAK dipanggil) — bukan langsung reject dengan error/HTTP status. Ini
 * simulasi paling realistis untuk "server tidak bisa dihubungi" (paket hilang/firewall
 * silent-drop) - beda dengan error response cepat yang gampang di-handle try/catch,
 * hang mengetes apakah UI benar-benar stuck (loading spinner selamanya) atau ada
 * timeout/retry/cancel yang menyelamatkan. TIDAK ADA cap durasi internal - biarkan
 * hang sampai client sendiri yang menyerah (browser/axios timeout kalau ada, atau
 * connection ditutup manual oleh user), sesuai definisi "diputus".
 */
export async function networkThrottleMiddleware(c: Context, next: Next) {
  const isSuperAdmin = c.var.user?.isSuperAdmin ?? false
  if (isSuperAdmin) return next()

  if (currentMode === 'offline') {
    return new Promise<void>(() => { /* sengaja tidak pernah resolve — simulasi koneksi terputus */ })
  }

  const delayMs = throttleDelayMs[currentMode]
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  await next()
}
