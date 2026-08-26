import { useYAxisScale, useChartHeight } from 'recharts';

/** Gradient split-warna di titik nilai tertentu pada sumbu-Y (2026-08-21,
 * awalnya lokal di `AreaChartWidget.tsx` utk split di titik 0 — "fill by
 * value" resmi recharts, dipakai net expansion M7). DIPUSATKAN ke sini
 * 2026-08-26 (instruksi user M8: "area cart dibawah ambang berwarna hijau
 * dan yang menembus berwarna merah") supaya bisa dipakai ulang oleh
 * `LineAlertWidget` (split di titik `threshold`, bukan cuma 0) TANPA
 * duplikasi — pola sama "Centralize UI, no duplication" yang sudah
 * berkali-kali ditegur. HARUS dirender sbg child langsung chart recharts
 * (bukan di widget level) krn `useYAxisScale`/`useChartHeight` baca context
 * internal recharts yang cuma ada di dalam chart.
 *
 * `splitValue` (default 0) — posisi split dihitung dari scale sumbu-Y ASLI
 * (bukan diasumsikan di tengah/persentase hardcode), benar berapa pun
 * rentang datanya. `aboveColor` dipakai utk bagian NILAI DI ATAS
 * `splitValue`, `belowColor` utk bagian DI BAWAH — caller yang menentukan
 * mana yang "bagus"/"jelek" (mis. M8 dormant: atas ambang = merah, bawah =
 * hijau; M6/M10 target-min: atas = hijau, bawah = merah — kebalikan). */
export function SplitColorGradient({ id, aboveColor, belowColor, splitValue = 0 }: { id: string; aboveColor: string; belowColor: string; splitValue?: number }) {
  const scale = useYAxisScale();
  const height = useChartHeight();
  const scaledSplit = scale?.(splitValue);
  if (scaledSplit == null || height == null) return null;
  const ratio = Math.min(1, Math.max(0, scaledSplit / height));
  return (
    <defs>
      {/* Opacity 0.9 dekat garis / 0.08 jauh darinya — pola sama persis
          versi asli (M7 net expansion), lihat riwayat di situ soal alasan
          angka ini (koreksi user "sama saja tidak ada perubahan warna"). */}
      <linearGradient id={id} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={aboveColor} stopOpacity={0.9} />
        <stop offset={`${ratio}`} stopColor={aboveColor} stopOpacity={0.08} />
        <stop offset={`${ratio}`} stopColor={belowColor} stopOpacity={0.08} />
        <stop offset="1" stopColor={belowColor} stopOpacity={0.9} />
      </linearGradient>
      {/* Gradient KEDUA khusus `stroke` (garis) — opacity SELALU penuh
          (tidak fade), dipakai HANYA kalau caller juga mau garisnya ikut
          split (opsional, lihat `LineAlertWidget` — default caller di sana
          TIDAK memakai bagian stroke ini, cuma fill). */}
      <linearGradient id={`${id}-stroke`} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={aboveColor} stopOpacity={1} />
        <stop offset={`${ratio}`} stopColor={aboveColor} stopOpacity={1} />
        <stop offset={`${ratio}`} stopColor={belowColor} stopOpacity={1} />
        <stop offset="1" stopColor={belowColor} stopOpacity={1} />
      </linearGradient>
    </defs>
  );
}
