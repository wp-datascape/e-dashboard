// i18next `language` bisa berupa kode region penuh ("en-US", "id-ID") kalau
// nilai itu sempat tersimpan di localStorage dari deteksi browser sebelumnya
// (lihat i18n/index.ts - resources dimuat berdasar 'id'/'en' saja, tapi
// `i18n.language` sendiri TIDAK selalu ditulis ulang jadi bentuk pendek,
// cuma resource-nya yang di-fallback lewat matching keluarga bahasa).
// Loader konten per-file (helpContent.ts, guideContent.ts) mencocokkan
// string PERSIS terhadap nama folder locale ('id'/'en'), jadi kode region
// penuh harus dipotong dulu - kalau tidak, diam-diam jatuh ke fallback 'id'
// meski UI sudah benar berbahasa Inggris.
export function normalizeLangCode(lang: string): string {
  return lang.split('-')[0].toLowerCase()
}
