import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface ChartCardTitleProps {
  title: string;
  /** Penjelasan KPI, ditampilkan sbg tooltip ikon info di sebelah judul
   * (2026-08-28, task029.md §44 — instruksi user: "Untuk penjelasan setiap
   * KPI nya pindahkan ke tooltip info saja. Agar lebih clean cart nya").
   * Sebelumnya deskripsi ini tampil PERMANEN sbg caption di bawah judul
   * (prop `subtitle` widget chart) — sekarang cuma muncul saat hover/tap
   * ikon, body kartu jadi lebih ringkas. */
  info?: string;
}

/** Judul kartu chart + ikon info opsional — dipusatkan di sini (dipakai
 * BarChartWidget/AreaChartWidget/DonutChartWidget/RadialBarWidget/
 * LineAlertWidget/BulletChartWidget) supaya blok Tooltip+InfoOutlinedIcon
 * tidak disalin 6x, pola sama `MetricInsightLine`. */
export function ChartCardTitle({ title, info }: ChartCardTitleProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Typography>
      {info && (
        <MuiTooltip
          title={info}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help', '&:hover': { color: 'text.secondary' } }} />
        </MuiTooltip>
      )}
    </Box>
  );
}
