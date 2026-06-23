// frontend/src/mocks/handlers.ts
import { authHandlers } from './handlers/auth.handler';
import { pageHandlers } from './handlers/page.handler';
import { dashboardHandlers } from './handlers/dashboard.handler';
import { metricsHandlers } from './handlers/metrics.handler';
import { rbacHandlers } from './handlers/rbac.handler';
import { usersHandlers } from './handlers/users.handler';
import { customersHandlers } from './handlers/customers.handler';
import { importHandlers } from './handlers/import.handler';
import { productsHandlers } from './handlers/products.handler';
import { transactionsHandlers } from './handlers/transactions.handler';
import { auditHandlers } from './handlers/audit.handler';

// Menggabungkan seluruh domain handler secara bersih menggunakan spread operator
// NOTE: authHandlers ENABLED untuk mock login di development
export const handlers = [
  ...authHandlers,
  // ...pageHandlers, // DISABLED — page settings now from real DB API
  ...dashboardHandlers,
  ...metricsHandlers,
  // ...rbacHandlers, // DISABLED — RBAC now from real backend API
  // ...usersHandlers, // DISABLED — users now from real DB API (backend/src/features/users)
  ...customersHandlers,
  ...importHandlers,
  ...productsHandlers,
  ...transactionsHandlers,
  // ...auditHandlers, // DISABLED — audit logs now from real DB API (backend/src/features/audit)
];
