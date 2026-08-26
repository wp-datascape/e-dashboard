import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Card } from '@/components/ui';

// `icon` opsional (koreksi user 2026-08-21: "hapus prefix M1 langsung judul
// saja di semuanya ganti simbol atau icon saja") — dulu judul section pakai
// prefix teks "M1 ·"/"M1.1 ·"/"M2 ·", sekarang diganti ikon MUI kecil di
// depan judul (BUKAN emoji — aturan proyek, lihat CLAUDE.md/memory).
export function SectionLabel({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
      {Icon && <Icon sx={{ fontSize: 14, color: 'text.secondary' }} />}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// Summary Card (Overview tab, dipindah ke sini 2026-08-21 — awalnya lokal di
// M1CrossSelling.tsx, sekarang dipusatkan supaya M2 (dan KPI lain nanti,
// "M1 jadi standar layout default utk semua KPI") bisa reuse langsung,
// bukan duplikat kode). Angka headline tunggal, beda dari KpiHeader (yang
// selalu current/YoY/change 1 metrik) — SummaryCard buat beberapa metrik
// sekaligus dalam 1 grid.
export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  color = 'primary.main',
  icon: Icon,
  highlighted = false,
}: {
  label: string;
  value: string | number;
  /** Opsional (2026-08-26, task029.md §36.17 — instruksi user: "buat text
   * lebih singkat jadi cukup 2 line") — kartu ringkasan Reaktivasi TIDAK
   * pakai baris ke-3 ini lagi (angka+persentase digabung 1 baris di
   * `value`), tapi caller lama yang masih kirim `sub` TIDAK berubah. */
  sub?: string;
  color?: string;
  /** Ikon kecil di depan label (2026-08-26) — pola SAMA PERSIS
   * `SectionLabel` (fontSize 14, color text.secondary, BUKAN badge
   * lingkaran berwarna) supaya konsisten dgn gaya ikon aplikasi
   * keseluruhan (koreksi user: "gaya icon tidak sesuai dengan desain
   * secara keseluruhan"). Opsional, default tanpa ikon (perilaku lama). */
  icon?: React.ElementType;
  /** Border teal (2026-08-26) — penanda "kartu ini konteks tab aktif",
   * pola minimal (cuma border, TANPA bg tint berwarna) sesuai gaya flat
   * aplikasi. Opsional, default false (perilaku lama). */
  highlighted?: boolean;
}) {
  return (
    <Card sx={{
      p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1,
      ...(highlighted && { borderColor: 'primary.main', borderWidth: 2 }),
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {Icon && <Icon sx={{ fontSize: 14, color: 'text.secondary' }} />}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Card>
  );
}
