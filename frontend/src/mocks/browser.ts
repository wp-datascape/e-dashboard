// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Passthrough all unhandled requests to the real backend
// Only specific mock handlers (auth, dashboard, etc) will intercept
export const worker = setupWorker(...handlers)
