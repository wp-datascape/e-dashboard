import type { Context } from 'hono'
import { success } from '@/utils/response'
import { getDashboard } from './dashboard.service'

export async function handleGetDashboard(c: Context) {
  const data = await getDashboard()
  return success(c, data)
}
