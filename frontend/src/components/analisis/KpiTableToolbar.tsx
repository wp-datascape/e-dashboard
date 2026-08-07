// frontend/src/components/analisis/KpiTableToolbar.tsx
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { Button } from '@/components/ui'

export interface KpiTableToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder: string
  /** Toggle "Utamakan pelanggan besar" (mis. filter Pareto) — opsional, tidak
   * semua halaman KPI punya konsep prioritas pelanggan. Tidak dirender kalau
   * `onOnlyPriorityChange` tidak diisi. */
  onlyPriority?: boolean
  onOnlyPriorityChange?: (v: boolean) => void
  onlyPriorityLabel?: string
  /** Export BELUM diimplementasi di halaman manapun (task025 — perlu keputusan
   * client-side vs server-side dulu). Tombol TIDAK dirender kalau `onExport`
   * tidak diisi — daripada tombol mati/disabled permanen yang membingungkan. */
  onExport?: () => void
  exportLabel?: string
  /** Teks jumlah baris SUDAH diformat oleh caller (mis. "952 pelanggan",
   * "120 transaksi") — komponen ini tidak tahu unit/pluralisasi per halaman. */
  totalCountText: string
}

/**
 * Toolbar di atas tabel KPI — search + toggle prioritas (opsional) + export
 * (opsional) + jumlah baris terfilter. Dipasangkan dengan `ResponsiveListView`
 * di bawahnya (bukan bagian dari komponen ini — table tetap milik tiap
 * halaman, cuma toolbar-nya yang dipusatkan).
 *
 * SATU-SATUNYA tempat menulis layout toolbar ini untuk semua halaman KPI
 * (task025) — jangan disalin-tempel manual
 * (lihat [[feedback_centralize_ui_no_duplication]]).
 */
export function KpiTableToolbar({
  search, onSearchChange, searchPlaceholder,
  onlyPriority, onOnlyPriorityChange, onlyPriorityLabel,
  onExport, exportLabel,
  totalCountText,
}: KpiTableToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { sm: '1 1 220px' } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
      />

      {onOnlyPriorityChange && (
        <FormControlLabel
          control={
            <Switch
              checked={!!onlyPriority}
              onChange={(e) => onOnlyPriorityChange(e.target.checked)}
              size="small"
            />
          }
          label={onlyPriorityLabel}
          sx={{ ml: 0, whiteSpace: 'nowrap' }}
        />
      )}

      {onExport && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
          onClick={onExport}
        >
          {exportLabel}
        </Button>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' }, whiteSpace: 'nowrap' }}>
        {totalCountText}
      </Typography>
    </Box>
  )
}
