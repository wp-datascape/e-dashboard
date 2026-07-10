import type { Context } from 'hono'
import { listDivisionsService, getDivisionByIdService, createDivisionService, updateDivisionService, deleteDivisionService } from './branch-divisions.service'
import { listDivisionsQuerySchema, createDivisionSchema, updateDivisionSchema, divisionIdParamSchema } from './branch-divisions.schema'
export async function handleListDivisions(c: Context) { const query = await listDivisionsQuerySchema.parseAsync(c.req.query()); const result = await listDivisionsService(query); return c.json({ success: true, data: result }) }
export async function handleGetDivisionById(c: Context) { const { id } = await divisionIdParamSchema.parseAsync(c.req.param()); const result = await getDivisionByIdService(id); return c.json({ success: true, data: result }) }
export async function handleCreateDivision(c: Context) { const body = await createDivisionSchema.parseAsync(await c.req.json()); const result = await createDivisionService(body, c); return c.json({ success: true, data: result }, 201) }
export async function handleUpdateDivision(c: Context) { const { id } = await divisionIdParamSchema.parseAsync(c.req.param()); const body = await updateDivisionSchema.parseAsync(await c.req.json()); const result = await updateDivisionService(id, body, c); return c.json({ success: true, data: result }) }
export async function handleDeleteDivision(c: Context) { const { id } = await divisionIdParamSchema.parseAsync(c.req.param()); await deleteDivisionService(id, c); return c.json({ success: true, message: 'Deleted' }) }
