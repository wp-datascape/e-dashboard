import { Hono } from 'hono'
import { handleListParetoAlertSettings, handleUpsertParetoAlertSetting } from './pareto-alert-settings.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const paretoAlertSettingsRoutes = new Hono()

// Reuse permission settings.threshold:* — section ini tampil di halaman
// Settings/Threshold yang sama dengan tabel threshold (task016 §19), bukan
// halaman/permission terpisah.
const paretoAlertSettingMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

paretoAlertSettingsRoutes.get('/', requirePermission('settings.threshold:view'), handleListParetoAlertSettings)
paretoAlertSettingsRoutes.put('/', requirePermission('settings.threshold:update'), paretoAlertSettingMutationRateLimit, handleUpsertParetoAlertSetting)
