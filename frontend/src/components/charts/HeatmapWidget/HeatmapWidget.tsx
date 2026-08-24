import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { formatIDR } from '@/utils/format';

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

export interface HeatmapWidgetProps {
  // Opsional (2026-08-21, koreksi user: "tampilan terlalu sesak dengan
  // text text tersebut" — title widget dulu WAJIB, sering dobel dgn
  // SectionLabel di luar widget, mis. "Matriks Cross Selling Pelanggan
  // (periode)" dobel persis dgn SectionLabel "Heatmap Cross Selling
  // Pelanggan" + helper text periode di atasnya).
  title?: string;
  subtitle?: string;
  /** Konten arbitrer di ATAS matrix, DI DALAM Card widget ini (2026-08-22,
   * instruksi user: "pindahkan ini sebagai judul card seperti diatas" —
   * pola SAMA PERSIS `ComboChartWidget.tsx`'s `headerContent`, dipakai M1
   * krn header lama — SectionLabel+helper text+chip — perlu StatusChip
   * di sampingnya, TIDAK bisa direpresentasikan `title`/`subtitle` string
   * biasa). Kalau diisi, MENGGANTIKAN render title/subtitle bawaan. */
  headerContent?: React.ReactNode;
  xLabels: string[];
  data: HeatmapRow[];
  /** Klik sel yang sudah ada transaksi (bought) — untuk drill-down detail produk */
  onCellClick?: (row: HeatmapRow, label: string) => void;
  /** Ikon kecil di depan title (2026-08-21, permintaan user: "terapkan di
   * semua matrix" — ganti prefix teks jadi ikon, BUKAN emoji). Opsional. */
  icon?: React.ElementType;
}

// Konten tooltip cell (2026-08-24) — dipusatkan, dipakai matrix desktop
// MAUPUN grid mobile (di bawah), supaya format tooltip selalu identik
// di kedua layout tanpa duplikasi logic.
function CellTooltipContent({
  t, customer, label, val, revenue, bought, clickable,
}: {
  t: TFunction; customer: string; label: string; val: number; revenue: number; bought: boolean; clickable: boolean;
}) {
  return (
    <ChartTooltipCard
      title={t('common.heatmap.cellTooltipTitle', { customer, label })}
      rows={
        bought
          ? [
              { label: t('common.heatmap.rowTransactionCount'), value: String(val) },
              { label: t('common.heatmap.colTotalRevenue'), value: formatIDR(revenue) },
            ]
          : [{ label: t('common.heatmap.rowStatus'), value: t('common.heatmap.statusNo') }]
      }
      hint={clickable ? t('common.heatmap.cellClickHint') : undefined}
      minWidth={200}
    />
  );
}

// arrow DIHAPUS, tooltip background transparan (2026-08-24) — tooltip chart
// M1/M2/M7 (recharts, ChartTooltipCard sbg content) juga box polos tanpa
// panah, disamakan biar layoutnya IDENTIK persis. Dipakai matrix desktop
// MAUPUN grid mobile.
const cellTooltipSlotProps = { tooltip: { sx: { bgcolor: 'transparent', p: 0, maxWidth: 'none', boxShadow: 'none' } } };

// ─── Desktop: Full Heatmap Matrix ─────────────────────────────────────────────
const COL_MIN_WIDTH = 80;
const ROW_LABEL_WIDTH = 160;

function HeatmapMatrixView({
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
                title={
                  <CellTooltipContent
                    t={t}
                    customer={row.customer}
                    label={label}
                    val={val}
                    revenue={revenue}
                    bought={bought}
                    clickable={bought && !!onCellClick}
                  />
                }
                slotProps={cellTooltipSlotProps}
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
                {formatIDR(row.totalRevenue ?? 0)}
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

// ─── Mobile: Grid 3-kolom per Customer ─────────────────────────────────────────
// Koreksi user (2026-08-24, "Aku ingin menghindar scroll ke samping dan
// mencegah text tidak terbaca" -> "Kalau dibuat jadi 2 kolom heatmap
// seperti ini? Tetap memakai kotak kotak tersebut" -> susulan "Coba pakai
// 3 kolom, sepertinya masih ada ruang yang cukup") — matrix sejajar-kolom
// TIDAK dipakai lagi di mobile (jumlah kategori dinamis tidak ada batas
// atas, mustahil dijamin muat tanpa scroll DAN teks tetap terbaca kalau
// tetap dipaksa 1 baris per customer). Tiap customer jadi blok: nama+total
// revenue di atas (selalu terlihat), lalu grid 3-kolom TETAP (bukan
// flex-wrap ikut panjang teks — itu bikin tepian berantakan) berisi kotak
// kategori (label+jumlah di dalam kotak, karena kolom antar-baris kategori
// tidak lagi sejajar seperti matrix). Wrap otomatis ke baris berikutnya
// kalau kategori > 3, TANPA scroll horizontal sama sekali.
function HeatmapMobileGridView({
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
      {data.map((row, idx) => (
        <Box key={row.customer}>
          {idx > 0 && <Divider sx={{ my: 1.5 }} />}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {row.customer}
            </Typography>
            {row.totalRevenue !== undefined && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', flexShrink: 0 }}>
                {formatIDR(row.totalRevenue)}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            {xLabels.map((label) => {
              const val = row.values[label] ?? 0;
              const bought = val > 0;
              const revenue = row.revenues?.[label] ?? 0;
              return (
                <Tooltip
                  key={label}
                  title={
                    <CellTooltipContent
                      t={t}
                      customer={row.customer}
                      label={label}
                      val={val}
                      revenue={revenue}
                      bought={bought}
                      clickable={bought && !!onCellClick}
                    />
                  }
                  slotProps={cellTooltipSlotProps}
                  placement="top"
                >
                  <Box
                    onClick={bought && onCellClick ? () => onCellClick(row, label) : undefined}
                    sx={{
                      bgcolor: bought ? 'success.main' : 'action.hover',
                      color: bought ? 'common.white' : 'text.disabled',
                      borderRadius: 0.5,
                      py: 0.75,
                      px: 0.5,
                      textAlign: 'center',
                      cursor: bought && onCellClick ? 'pointer' : 'default',
                      transition: 'opacity 0.15s',
                      '&:active': { opacity: 0.8 },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', fontSize: '0.66rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {bought ? val : '—'}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
export const HeatmapWidget = ({ title, subtitle, headerContent, xLabels, data, onCellClick, icon: Icon }: HeatmapWidgetProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card sx={{ p: 2 }}>
      {/* Header — title/subtitle keduanya opsional (2026-08-21, koreksi user:
          tampilan sesak, dobel dgn SectionLabel+helper text di luar widget). */}
      {headerContent ? (
        <Box sx={{ mb: 2 }}>{headerContent}</Box>
      ) : (title || subtitle) && (
        <Box sx={{ mb: 2 }}>
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {Icon && <Icon sx={{ fontSize: 16, color: 'text.primary' }} />}
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {title}
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Mobile: grid 3-kolom per customer (HeatmapMobileGridView). Desktop:
          matrix sejajar-kolom (HeatmapMatrixView) — lihat komentar
          masing-masing di atas. */}
      {isMobile ? (
        <HeatmapMobileGridView xLabels={xLabels} data={data} onCellClick={onCellClick} />
      ) : (
        <HeatmapMatrixView xLabels={xLabels} data={data} onCellClick={onCellClick} />
      )}
    </Card>
  );
};