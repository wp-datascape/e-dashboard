import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

export interface HeatmapRow {
  customer: string;
  values: Record<string, number>;
}

export interface HeatmapWidgetProps {
  title: string;
  subtitle?: string;
  xLabels: string[];
  data: HeatmapRow[];
}

export const HeatmapWidget = ({ title, subtitle, xLabels, data }: HeatmapWidgetProps) => {
  return (
    <Paper
      elevation={0}
      square
      sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, minWidth: 520 }}>
          <Box sx={{ width: 170, flexShrink: 0 }} />
          {xLabels.map((label) => (
            <Box key={label} sx={{ flex: 1, textAlign: 'center', px: 0.25 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Data rows */}
        {data.map((row) => (
          <Box
            key={row.customer}
            sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minWidth: 520 }}
          >
            <Box sx={{ width: 170, flexShrink: 0, pr: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.customer}
              </Typography>
            </Box>
            {xLabels.map((label) => {
              const val = row.values[label] ?? 0;
              const bought = val > 0;
              return (
                <Tooltip
                  key={label}
                  title={`${row.customer} — ${label}: ${bought ? `Ya (${val} transaksi)` : 'Tidak ada transaksi'}`}
                  arrow
                  placement="top"
                >
                  <Box sx={{ flex: 1, px: 0.25 }}>
                    <Box
                      sx={{
                        bgcolor: bought ? '#15803d' : '#e5e7eb',
                        color: bought ? '#fff' : '#9ca3af',
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'default',
                        transition: 'opacity 0.15s',
                        '&:hover': { opacity: 0.8 },
                      }}
                    >
                      {bought ? 'Ya' : 'Tdk'}
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, minWidth: 520 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 14, height: 14, bgcolor: '#15803d' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              Ya (ada transaksi)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 14, height: 14, bgcolor: '#e5e7eb' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              Tidak (tidak ada)
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};