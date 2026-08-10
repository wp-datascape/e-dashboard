import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

// Tinggi+urutan mirror layout StatCard baru (vertikal, 2026-08-09) — judul,
// lingkaran status kanan atas, angka besar, chart penuh lebar, link
// breakdown — supaya tidak ada lompatan tinggi kartu pas data selesai load.
export function StatCardSkeleton() {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton variant="text" width="50%" height={14} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      <Skeleton variant="text" width="40%" height={36} />
      <Skeleton variant="text" width="70%" height={12} />
      <Skeleton variant="rectangular" width="100%" height={64} sx={{ mt: 'auto' }} />
      <Skeleton variant="text" width="45%" height={12} />
    </Box>
  )
}