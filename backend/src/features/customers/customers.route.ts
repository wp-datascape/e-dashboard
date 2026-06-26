import { Hono } from 'hono'
import { handleGetCustomers, handleGetCustomerDetail } from './customers.handler'

export const customersRoutes = new Hono()

customersRoutes.get('/', handleGetCustomers)
customersRoutes.get('/:id', handleGetCustomerDetail)
