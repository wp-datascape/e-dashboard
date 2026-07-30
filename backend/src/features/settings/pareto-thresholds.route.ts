import { Hono } from 'hono'
import {
  handleListParetoThresholds,
  handleUpsertParetoThreshold,
  handleDeleteParetoThreshold,
} from './pareto-thresholds.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const paretoThresholdsRoutes = new Hono()

// Reuse permission settings.threshold:* — section ini tampil di halaman
// Settings/Threshold yang sama (task016 §7), bukan halaman/permission terpisah.
const paretoThresholdMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

paretoThresholdsRoutes.get('/', requirePermission('settings.threshold:view'), handleListParetoThresholds)
paretoThresholdsRoutes.put('/', requirePermission('settings.threshold:update'), paretoThresholdMutationRateLimit, handleUpsertParetoThreshold)
paretoThresholdsRoutes.delete('/:id', requirePermission('settings.threshold:update'), paretoThresholdMutationRateLimit, handleDeleteParetoThreshold)
