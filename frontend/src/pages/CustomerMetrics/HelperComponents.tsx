import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Typography>
  );
}

export function Row({
  label,
  value,
  highlight,
  icon,
}: {
  label: string
  value: string
  highlight?: boolean
  icon?: string
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="caption" color={highlight ? 'warning.main' : 'text.secondary'}>
        {icon}{label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, color: highlight ? 'warning.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}
