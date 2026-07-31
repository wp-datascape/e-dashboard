import { Hono } from 'hono'
import {
  handleGetConfigs, handleUpdateConfig,
  handleGetAccurateCredentials, handleSaveAccurateCredentials,
  handleTestAccurateConnection,
} from './config.handler'
import {
  handleGetResendSettings, handleSaveResendSettings, handleSendTestEmail, handleSendTestDigestEmail,
} from './resend-settings.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const configRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06) — business_configs
// termasuk flag branch_division_enforcement_enabled (task001 §F2/F3), security-relevant.
const configMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })
// 15/5menit — credential Accurate (API token/secret) disimpan ter-encrypt, sensitif.
const credentialMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 15, keyFn: keyByUser })
// 10/5menit — beda karakter: ini manggil API EKSTERNAL Accurate, bukan cuma DB lokal.
// Threshold rendah supaya tidak jadi vektor hammer ke layanan pihak ketiga (bisa bikin
// kita di-block Accurate) atau abuse internal utk probing koneksi berulang-ulang.
const testConnectionRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 10, keyFn: keyByUser })

// Business configs (threshold settings)
configRoutes.get('/', requirePermission('settings.threshold:view'), handleGetConfigs)
configRoutes.put('/:key', requirePermission('settings.threshold:update'), configMutationRateLimit, handleUpdateConfig)

// Accurate integration credentials
configRoutes.get('/accurate/credentials/:branchId', requirePermission('config.integration:view'), handleGetAccurateCredentials)
configRoutes.put('/accurate/credentials/:branchId', requirePermission('config.integration:create', 'config.integration:update'), credentialMutationRateLimit, handleSaveAccurateCredentials)
configRoutes.post('/accurate/test-connection', requirePermission('config.integration:test'), testConnectionRateLimit, handleTestAccurateConnection)

// Resend integration (task016 Fase C, §21) — SINGLETON global, bukan per-branch
// seperti Accurate di atas, reuse permission config.integration:* yang sama
// (section berbeda di halaman Config/Integration yang sama).
configRoutes.get('/resend/settings', requirePermission('config.integration:view'), handleGetResendSettings)
configRoutes.put('/resend/settings', requirePermission('config.integration:create', 'config.integration:update'), credentialMutationRateLimit, handleSaveResendSettings)
configRoutes.post('/resend/test-email', requirePermission('config.integration:test'), testConnectionRateLimit, handleSendTestEmail)
// Kirim CONTOH digest laporan pakai template asli (task016 §22) — beda dari
// test-email di atas yang cuma pesan generik, ini exercise layout/branding
// digest sungguhan sebelum admin nyalakan toggle is_active.
configRoutes.post('/resend/test-digest-email', requirePermission('config.integration:test'), testConnectionRateLimit, handleSendTestDigestEmail)
