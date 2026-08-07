import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

export interface FormulaHelpIconProps {
  /** Judul rumus, mis. "Dormant Rate". Opsional — kalau tidak diisi, tooltip
   * cuma tampilkan `formula` + `note` tanpa judul terpisah. */
  title?: string
  /** Rumus perhitungan APA ADANYA (monospace) — HARUS diverifikasi ke kode
   * backend nyata, bukan disalin dari dokumentasi bisnis yang bisa basi
   * (lihat task025 §6b: `metrics.md` sempat tidak sinkron dgn kode utk
   * threshold dormant). */
  formula: string
  /** Catatan tambahan opsional (mis. parameter yang bisa berubah per scope). */
  note?: string
}

/**
 * Ikon ⓘ + tooltip khusus RUMUS PERHITUNGAN KPI — beda dari pola
 * `InfoOutlinedIcon` yang sudah ada di M3-M7 (`CustomerMetrics/*.tsx`, isinya
 * caveat interpretasi bahasa awam, bukan rumus). Dipusatkan di sini (task025
 * §6b, permintaan user 2026-08-07: "cantumkan rumus dalam icon help dan
 * tooltip") supaya konsisten dipakai di semua halaman KPI — TIDAK menyalin
 * JSX Box+Tooltip+IconButton manual lagi di tiap halaman
 * (lihat [[feedback_centralize_ui_no_duplication]]).
 *
 * M3-M7 belum di-migrasi ke komponen ini (di luar scope task025 §6b saat
 * ditulis — beda konsep kontennya, caveat vs rumus), cuma dicatat sebagai
 * follow-up opsional.
 */
export function FormulaHelpIcon({ title, formula, note }: FormulaHelpIconProps) {
  return (
    <Tooltip
      title={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {title && (
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 12 }}>
              {title}
            </Typography>
          )}
          <Typography
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              m: 0,
            }}
          >
            {formula}
          </Typography>
          {note && (
            <Typography variant="caption" sx={{ fontSize: 11, color: 'grey.400' }}>
              {note}
            </Typography>
          )}
        </Box>
      }
      placement="top"
      arrow
      slotProps={{ tooltip: { sx: { maxWidth: 320, lineHeight: 1.5 } } }}
    >
      <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  )
}
