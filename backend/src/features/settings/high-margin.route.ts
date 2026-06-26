import { Hono } from 'hono'
import {
  handleListHighMargins,
  handleCreateHighMargin,
  handleUpdateHighMargin,
  handleDeactivateHighMargin,
  handleDeleteHighMargin,
} from './high-margin.handler'

export const highMarginRoutes = new Hono()

highMarginRoutes.get('/', handleListHighMargins)
highMarginRoutes.post('/', handleCreateHighMargin)
highMarginRoutes.patch('/:id', handleUpdateHighMargin)
highMarginRoutes.patch('/:id/deactivate', handleDeactivateHighMargin)
highMarginRoutes.delete('/:id', handleDeleteHighMargin)
