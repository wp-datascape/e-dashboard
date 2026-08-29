import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

export function StatCardSkeleton() {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: 160 }}>
      <Skeleton variant="text" width="60%" height={14} />
      <Skeleton variant="text" width="40%" height={36} sx={{ my: 0.5 }} />
      <Skeleton variant="text" width="80%" height={12} />
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ mt: 1 }} />
    </Box>
  )
}