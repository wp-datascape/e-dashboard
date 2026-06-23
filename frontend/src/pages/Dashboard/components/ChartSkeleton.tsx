import Skeleton from '@mui/material/Skeleton'

interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 280 }: ChartSkeletonProps) {
  return <Skeleton variant="rectangular" width="100%" height={height} />
}