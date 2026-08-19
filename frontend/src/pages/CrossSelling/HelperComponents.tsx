import Typography from '@mui/material/Typography';
import { Card } from '@/components/ui';

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

export function KpiCard({
  label,
  value,
  sub,
  color = 'primary.main',
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Card>
  );
}
