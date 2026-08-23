import type { ComponentType } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material/SvgIcon';

// Timeline "Top 5" (dot + garis penghubung kiri, rank+nama+metrik+chip ikon
// tren di kanan) — dipakai di samping chart utama pada layout standar KPI
// (M1CrossSelling.tsx, M2AvgCategory.tsx sudah pakai pola ini, versi inline
// masing-masing SEBELUM diekstrak; M7ExpansionGrowth.tsx pemakai ke-3, 2026-
// 08-23). Diekstrak ke sini supaya KPI berikutnya yang butuh pola sama TIDAK
// menyalin ulang markup Box+sx-nya (pola "centralize UI, no duplication").
// `icon`/`iconColor` SENGAJA dikontrol penuh oleh caller (bukan enum
// up/down/flat tetap di komponen ini) — tiap KPI punya jumlah kategori tren
// beda (M1/M2 3-way naik/turun/stabil, M7 4-way +nonaktif), komponen ini
// murni presentational, tidak menyimpan logic bisnis "apa artinya naik".
export interface TopMoverItem {
  id: string | number;
  name: string;
  metricText: string;
  icon: ComponentType<SvgIconProps>;
  iconColor: string;
}

interface TopMoversTimelineProps {
  items: TopMoverItem[];
  emptyMessage: string;
}

export function TopMoversTimeline({ items, emptyMessage }: TopMoversTimelineProps) {
  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>;
  }

  return (
    <>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const Icon = item.icon;
        return (
          <Box key={item.id} sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, mt: 0.5 }} />
              {!isLast && <Box sx={{ flex: 1, width: '2px', bgcolor: 'divider', my: 0.5 }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, pb: isLast ? 0.5 : 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                {i + 1}. {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
                {item.metricText}
              </Typography>
              <Box
                sx={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(item.iconColor, 0.15), flexShrink: 0,
                }}
              >
                <Icon sx={{ fontSize: 14, color: item.iconColor }} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </>
  );
}
