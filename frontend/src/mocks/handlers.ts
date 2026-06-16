// frontend/src/mocks/handlers.ts
import { authHandlers } from './handlers/auth.handler';
import { pageHandlers } from './handlers/page.handler';

// Menggabungkan seluruh domain handler secara bersih menggunakan spread operator
export const handlers = [
  ...authHandlers,
  ...pageHandlers,
];