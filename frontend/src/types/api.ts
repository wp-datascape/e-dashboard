export type ErrorCodeType =
  | 'VALIDATION_ERROR'
  | 'INVALID_FILE_FORMAT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'COMPANY_ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR'
  | 'ACCURATE_API_ERROR'
  | 'IMPORT_PROCESSING_ERROR'
  | 'DUPLICATE_IMPORT'
  | 'FILE_TOO_LARGE';

export interface ApiResponse<T = Record<string, never>> {
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
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