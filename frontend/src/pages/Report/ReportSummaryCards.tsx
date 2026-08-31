// ReportSummaryCards.tsx (2026-08-26, task029.md §36.18/§36.19 — instruksi
// user: "layout reaktivasi adalah layout standar untuk menu laporan")
// Digeneralisasi dari ReactivationSummaryCards.tsx (page-specific) supaya
// dipakai SEMUA tab Laporan (Dormant, Repeat Order, dst) — Centralize UI,
// bukan copy-paste per tab. Reaktivasi TIDAK diganti ke komponen ini (biar
// tidak ada risiko regresi tanpa perlu) — tab BARU pakai ini langsung.
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { Card } from '@/components/ui';

export interface ReportSummaryCardItem {
  label: string;
  value: string;
  /** Sub-nilai kecil dlm kurung di sebelah value (mis. persentase) — opsional. */
  pct?: string | null;
  icon?: SvgIconComponent;
  iconColor?: 'success' | 'warning' | 'error' | 'primary';
  highlighted?: boolean;
  /** Lebar grid per breakpoint md — default 12/jumlah item (rata sama besar). */
  md?: number;
  // info (2026-08-26, task029.md §36.20 — instruksi user: "verifikasi
  // setiap data nya dan berikan info tooltip agar user tidak salah
  // faham") — populasi/window tiap kartu ringkasan Laporan TIDAK selalu
  // sebanding satu sama lain antar tab (mis. "Total Existing Customer"
  // di tab Repeat Order cuma customer AKTIF bulan ini, sedangkan
  // "Jumlah Dormant" di tab Dormant mencakup SELURUH customer established
  // — beda window & populasi, BUKAN bug walau angkanya jomplang jauh,
  // sudah diverifikasi langsung ke DB). Tooltip wajib dipasang di kartu
  // mana pun yang berpotensi disalahartikan sebanding dgn kartu lain.
  info?: string;
}

function StatCard({ label, value, pct, icon: Icon, iconColor, highlighted, info }: ReportSummaryCardItem) {
  return (
    <Card sx={{
      p: 2, height: '100%',
      ...(highlighted && { borderColor: 'primary.main', borderWidth: 2 }),
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{label}</Typography>
        {info && (
          <MuiTooltip
            title={info}
            placement="top"
            arrow
            slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help', '&:hover': { color: 'text.secondary' } }} />
          </MuiTooltip>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
          {pct && <Typography variant="caption" color="text.secondary">({pct})</Typography>}
        </Box>
        {Icon && <Icon color={iconColor} fontSize="small" sx={{ flexShrink: 0 }} />}
      </Box>
    </Card>
  );
}

export function ReportSummaryCards({ items }: { items: ReportSummaryCardItem[] }) {
  const defaultMd = 12 / items.length;
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {items.map((item, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: item.md ?? defaultMd }}>
          <StatCard {...item} />
        </Grid>
      ))}
    </Grid>
  );
}
