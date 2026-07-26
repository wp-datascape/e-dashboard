export type ErrorCodeType =
  | 'VALIDATION_ERROR'
  | 'INVALID_FILE_FORMAT'
  | 'INVALID_REFERENCE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'COMPANY_ACCESS_DENIED'
  | 'CSRF_INVALID'
  | 'SYSTEM_RESOURCE'
  | 'NOT_FOUND'
  | 'CONFLICT' // dipakai MSW mock handlers (dev) — backend asli pakai DUPLICATE_ENTRY
  | 'DUPLICATE_IMPORT'
  | 'DUPLICATE_ENTRY'
  | 'FILE_TOO_LARGE'
  | 'IMPORT_PROCESSING_ERROR'
  | 'RATE_LIMITED'
  | 'ACCURATE_API_ERROR'
  | 'INTERNAL_ERROR'
  | 'INTERNAL_SERVER_ERROR'; // fallback axios.ts saat tidak ada response (network error)

export interface ApiResponse<T = Record<string, never>> {
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  // Agregat opsional di luar data per-baris (mis. total keseluruhan produk yang
  // difilter) - lihat backend/src/utils/response.ts PaginationMeta.summary.
  summary?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  error: ErrorCodeType;
  message: string;
  details?: unknown; // Menyimpan data spesifik dari validasi Zod jika ada
}