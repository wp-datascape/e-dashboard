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
  /** ID numerik customer — opsional, dipakai untuk drill-down klik sel */
  customerId?: number;
  values: Record<string, number>;
  /** Revenue per kolom (sama key dengan values) — opsional, dipakai untuk tooltip sel */
  revenues?: Record<string, number>;
  /** Total revenue customer ini across semua kolom — opsional, ditampilkan sebagai kolom tambahan */
  totalRevenue?: number;
}

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

export interface HeatmapWidgetProps {
  title: string;
  subtitle?: string;
  xLabels: string[];
  data: HeatmapRow[];
  /** Klik sel yang sudah ada transaksi (bought) — untuk drill-down detail produk */
  onCellClick?: (row: HeatmapRow, label: string) => void;
}

// ─── Mobile: Per-Customer Card List ───────────────────────────────────────────
// Tiap customer ditampilkan sebagai card dengan chip produk yang dibeli
function MobileCustomerListView({
  xLabels,
  data,
  onCellClick,
}: {
  xLabels: string[];
  data: HeatmapRow[];
  onCellClick?: (row: HeatmapRow, label: string) => void;
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
                      onClick={bought && onCellClick ? () => onCellClick(row, label) : undefined}
                    />
                  );
                })}
              </Box>

              {/* Total transaksi + total revenue */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {totalTx > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {t('common.heatmap.totalTransactions', { count: totalTx })}
                  </Typography>
                )}
                {row.totalRevenue !== undefined && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {t('common.heatmap.totalRevenue', { value: fmtRp(row.totalRevenue) })}
                  </Typography>
                )}
              </Box>
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
  onCellClick,
}: {
  xLabels: string[];
  data: HeatmapRow[];
  onCellClick?: (row: HeatmapRow, label: string) => void;
}) {
  const { t } = useTranslation();
  const hasRevenue = data.some((r) => r.totalRevenue !== undefined);
  const innerMinWidth = ROW_LABEL_WIDTH + (xLabels.length + (hasRevenue ? 1 : 0)) * COL_MIN_WIDTH;

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
        {hasRevenue && (
          <Box sx={{ flex: 1, textAlign: 'center', px: 0.5, minWidth: COL_MIN_WIDTH }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}
            >
              {t('common.heatmap.colTotalRevenue')}
            </Typography>
          </Box>
        )}
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
            const revenue = row.revenues?.[label] ?? 0;
            return (
              <Tooltip
                key={label}
                title={t('common.heatmap.cellTooltip', {
                  customer: row.customer,
                  label,
                  status: bought
                    ? t('common.heatmap.statusYes', { count: val, revenue: fmtRp(revenue) })
                    : t('common.heatmap.statusNo'),
                })}
                arrow
                placement="top"
              >
                <Box sx={{ flex: 1, px: 0.5, minWidth: COL_MIN_WIDTH }}>
                  <Box
                    onClick={bought && onCellClick ? () => onCellClick(row, label) : undefined}
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
                      cursor: bought && onCellClick ? 'pointer' : 'default',
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

          {/* Total revenue column */}
          {hasRevenue && (
            <Box sx={{ flex: 1, px: 0.5, minWidth: COL_MIN_WIDTH, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'success.main' }}>
                {fmtRp(row.totalRevenue ?? 0)}
              </Typography>
            </Box>
          )}
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
export const HeatmapWidget = ({ title, subtitle, xLabels, data, onCellClick }: HeatmapWidgetProps) => {
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
        <MobileCustomerListView xLabels={xLabels} data={data} onCellClick={onCellClick} />
      ) : (
        <DesktopHeatmapView xLabels={xLabels} data={data} onCellClick={onCellClick} />
      )}
    </Card>
  );
};