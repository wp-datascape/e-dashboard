// Singkatan jt/M — dipertahankan KHUSUS formatter axis chart (yAxisFormatter/formatBar/
// formatLine di M3Revenue & M4GrossProfit) yang ruangnya sempit. Pemakaian lain (tabel,
// tooltip, dialog) sudah pindah ke formatRupiah (@/utils/format, angka penuh, 2026-08-19).
export function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000)         return `${Math.round(v / 1_000)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

// fmtRpDetail (2 desimal) dihapus 2026-08-19 — semua pemakainya (tooltip, dialog,
// kolom tabel di M3/M4/M5/M7) pindah ke formatRupiah (angka penuh), yang sekaligus
// menghilangkan masalah presisi yang dulu jadi alasan fmtRpDetail ada.

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// monthToEndDate dihapus (2026-08-22) — bug: klik bar bulan berjalan buka
// drill-down "per akhir bulan" (tanggal MASA DEPAN), beda dari tabel utama
// yang "per hari ini", 2 sumber data yang harusnya sama jadi tidak sinkron
// (laporan user: "sumber atau filtering-nya tidak sama dengan data dalam
// tabel"). Semua pemakai (M3-M7) pindah ke resolvePeriodEnd (@/utils/date)
// yang clamp ke hari ini kalau bulannya masih berjalan, lihat task029.md
// §30.16 lanjutan.
