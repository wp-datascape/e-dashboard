import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

// Laporan > Retention (task029.md §30.19, 2026-08-22) — shell/placeholder.
// Retention/index.tsx (halaman chart) TIDAK punya tabel breakdown permanen
// sama sekali (cuma dialog drill-down klik-chart, M6/M8/M9/M10 semuanya
// begitu) — belum ada yang dipindahkan ke sini. Instruksi user: "nanti
// kita maping tabel-tabel apa saja yang kita masukkan disana" — BELUM
// diputuskan, halaman ini disiapkan supaya menu+route-nya sudah ada begitu
// keputusan itu dibuat, bukan dikerjakan sekarang.
export default function ReportRetention() {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="pageTitle">{t('nav.groups.report')} · {t('nav.groups.retention')}</Typography>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('common.report.comingSoon')}
        </Typography>
      </Card>
    </Box>
  );
}
