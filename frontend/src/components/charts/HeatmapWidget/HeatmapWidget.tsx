import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/components/ui/StatusChip';

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

// ─── Mobile: Per-Customer Card List ───────────────────────────────────────────
// Tiap customer ditampilkan sebagai card dengan chip produk yang dibeli
function MobileCustomerListView({
  xLabels,
  data,
}: {
  xLabels: string[];
  data: HeatmapRow[];
}) {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1.5, display: 'block' }}>
        {t('common.heatmap.summaryLine', { count: data.length })}
      </Typography>

      {data.map((row, idx) => {
        const boughtLabels = xLabels.filter((l) => (row.values[l] ?? 0) > 0);
        const totalTx = xLabels.reduce((sum, l) => sum + (row.values[l] ?? 0), 0);

        return (
          <Box key={row.customer}>
            {idx > 0 && <Divider sx={{ my: 1 }} />}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                py: 0.5,
              }}
            >
              {/* Customer name + summary */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.customer}
                </Typography>
                <StatusChip
                  label={t('common.heatmap.productsCount', { bought: boughtLabels.length, total: xLabels.length })}
                  color={boughtLabels.length > 0 ? 'primary' : 'default'}
                />
              </Box>

              {/* Product chips */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {xLabels.map((label) => {
                  const val = row.values[label] ?? 0;
                  const bought = val > 0;
                  return (
                    <StatusChip
                      key={label}
                      label={bought ? `${label} (${val}×)` : label}
                      color={bought ? 'success' : 'default'}
                    />
                  );
                })}
              </Box>

              {/* Total transaksi */}
              {totalTx > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t('common.heatmap.totalTransactions', { count: totalTx })}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Desktop: Full Heatmap Matrix ─────────────────────────────────────────────
const COL_MIN_WIDTH = 80;
const ROW_LABEL_WIDTH = 160;

function DesktopHeatmapView({
  xLabels,
  data,
}: {
  xLabels: string[];
  data: HeatmapRow[];
}) {
  const { t } = useTranslation();
  const innerMinWidth = ROW_LABEL_WIDTH + xLabels.length * COL_MIN_WIDTH;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, minWidth: innerMinWidth }}>
        <Box sx={{ width: ROW_LABEL_WIDTH, flexShrink: 0 }} />
        {xLabels.map((label) => (
          <Box key={label} sx={{ flex: 1, textAlign: 'center', px: 0.5, minWidth: COL_MIN_WIDTH }}>
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
          sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minWidth: innerMinWidth }}
        >
          {/* Sticky row label */}
          <Box
            sx={{
              width: ROW_LABEL_WIDTH,
              flexShrink: 0,
              pr: 1,
              position: 'sticky',
              left: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
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

          {/* Cells */}
          {xLabels.map((label) => {
            const val = row.values[label] ?? 0;
            const bought = val > 0;
            return (
              <Tooltip
                key={label}
                title={t('common.heatmap.cellTooltip', {
                  customer: row.customer,
                  label,
                  status: bought ? t('common.heatmap.statusYes', { count: val }) : t('common.heatmap.statusNo'),
                })}
                arrow
                placement="top"
              >
                <Box sx={{ flex: 1, px: 0.5, minWidth: COL_MIN_WIDTH }}>
                  <Box
                    sx={{
                      bgcolor: bought ? 'success.main' : 'action.hover',
                      color: bought ? 'common.white' : 'text.disabled',
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: 0.5,
                      cursor: 'default',
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 0.8 },
                    }}
                  >
                    {bought ? val : '—'}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      ))}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, minWidth: innerMinWidth, pl: `${ROW_LABEL_WIDTH}px` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, bgcolor: 'success.main', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
            {t('common.heatmap.legendBought')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, bgcolor: 'action.hover', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
            {t('common.heatmap.legendNotBought')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const HeatmapWidget = ({ title, subtitle, xLabels, data }: HeatmapWidgetProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {isMobile
              ? t('common.heatmap.mobileSubtitle')
              : subtitle}
          </Typography>
        )}
      </Box>

      {/* Responsive: Mobile = per-customer card list, Desktop = full matrix */}
      {isMobile ? (
        <MobileCustomerListView xLabels={xLabels} data={data} />
      ) : (
        <DesktopHeatmapView xLabels={xLabels} data={data} />
      )}
    </Card>
  );
};