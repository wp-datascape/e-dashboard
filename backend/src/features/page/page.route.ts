import { Hono } from 'hono'
import { handleGetPageSettings, handleUpdatePageSetting } from './page.handler'

export const pageRoutes = new Hono()

pageRoutes.get('/', handleGetPageSettings)
pageRoutes.put('/:pageKey', handleUpdatePageSetting)
