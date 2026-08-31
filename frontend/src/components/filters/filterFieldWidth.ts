// frontend/src/components/filters/filterFieldWidth.ts

/**
 * Lebar SERAGAM untuk semua field filter select/date (Entitas, Cabang,
 * Divisi, Granularitas, Tanggal, dst) — instruksi user 2026-08-20: field
 * filter harus sama panjang semua, FIXED bukan minWidth/auto per label
 * (sebelumnya beda-beda: Entitas 160, Branch/Division 150, Granularitas
 * 140 — baris filter jadi tidak rata).
 *
 * SATU konstanta dipakai di semua komponen filter shared (ScopeFilterFields,
 * PeriodTypeFilterFields, dan DatePicker "Periode" di tiap halaman KPI) —
 * "global" sesuai instruksi user, jadi otomatis konsisten di semua halaman
 * pemanggil tanpa perlu diatur ulang manual satu-satu.
 */
export const FILTER_FIELD_WIDTH = 160
