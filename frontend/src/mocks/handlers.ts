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

// Menggabungkan seluruh domain handler secara bersih menggunakan spread operator
export const handlers = [
  ...authHandlers,
  ...pageHandlers,
  ...dashboardHandlers,
  ...metricsHandlers,
  ...rbacHandlers,
  ...usersHandlers,
  ...customersHandlers,
  ...importHandlers,
  ...productsHandlers,
  ...transactionsHandlers,
];
