import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { useTheme } from '@mui/material/styles';

export interface ChartTooltipRow {
  label: string;
  value: string;
  highlight?: boolean;
}

interface ChartTooltipCardProps {
  title: string;
  rows: ChartTooltipRow[];
  /** Hint klik (2026-08-24, koreksi user: chip "Klik untuk lihat detail" di
   * header chart pindah ke sini — muncul persis saat user sudah hover/tap
   * titik chart, momen paling relevan, bukan chip permanen yg rawan
   * diabaikan (banner blindness) atau tooltip icon terpisah yang perlu
   * ditemukan dulu. Opsional — chart tanpa onBarClick tidak perlu ini. */
  hint?: string;
  minWidth?: number;
}

/** Kartu tooltip chart atomic (2026-08-24, task029.md §31) — chrome
 * (border+judul+divider+baris label:value+hint opsional) dipusatkan di sini,
 * dipakai M1/M2/M7 (masing-masing cuma kirim rows sesuai datanya sendiri) —
 * sebelumnya M1/M7 py implementasi mirip tapi terpisah, M2 belum py custom
 * tooltip sama sekali (pola "Centralize UI, No Duplication"). */
export function ChartTooltipCard({ title, rows, hint, minWidth = 230 }: ChartTooltipCardProps) {
  const theme = useTheme();

  return (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, p: 1.5, minWidth, fontSize: 12 }}>
      {/* color eksplisit (2026-08-25, koreksi user: "text tooltip tidak
          terbaca di mode terang") — sebelumnya tanpa color, warisi default
          MUI Tooltip (#fff, diasumsikan background gelap). bgcolor Box ini
          SUDAH `background.paper` (terang di light mode) tapi color-nya
          tidak ikut di-override, jadi judul putih di atas box putih. Baris
          label/value di bawah aman krn sudah py color eksplisit
          (text.secondary/text.primary/warning.main). */}
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.primary' }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {rows.map((r, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            {/* sx.color, BUKAN prop `color=` (2026-08-25, susulan koreksi
                title di atas) — prop `color` Typography cuma terima token
                pendek ('textSecondary', BUKAN 'text.secondary' berbentuk
                path). Nilai path bertitik yang lama gagal senyap (bukan
                error), warisi putih default Tooltip persis spt bug title.
                Baris value sebelah sudah py pola sx yang benar, disamakan. */}
            <Typography variant="caption" sx={{ color: r.highlight ? 'warning.main' : 'text.secondary' }}>
              {r.label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: r.highlight ? 'warning.main' : 'text.primary' }}>
              {r.value}
            </Typography>
          </Box>
        ))}
      </Box>
      {hint && (
        <>
          <Divider sx={{ mt: 1, mb: 0.75 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
            <TouchAppIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              {hint}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
