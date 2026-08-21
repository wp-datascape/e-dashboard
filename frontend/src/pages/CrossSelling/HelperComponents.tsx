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
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Card>
  );
}
