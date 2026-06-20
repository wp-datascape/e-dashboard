import { Hono } from 'hono'
import { env } from '@/config/env'
import { createRouter } from '@/router'

const app = new Hono()

createRouter(app)

export default {
  port: env.PORT,
  fetch: app.fetch,
}
