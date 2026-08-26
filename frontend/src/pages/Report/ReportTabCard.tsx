// ReportTabCard.tsx (2026-08-26, task029.md §36.16 — instruksi user, screenshot
// tab Reaktivasi: "Area ini bisa kan dijadikan header tabel, jadi ada di
// dalam card. Lalu pisahkan search dan filter, search di sebelah kiri dan
// shorting di sebelah kanan card") — SEBELUMNYA ringkasan+search+sort
// mengambang lepas di atas tabel (bukan di dalam Card), search dan sort
// nempel sejajar kiri sama-sama. Dipusatkan di sini (Centralize UI) krn
// pola search+sort+summary ini identik di SEMUA 8 tab Laporan
// (Revenue/GP/HM Ranking/Cross Selling/Expansion/ROR/Dormant/Reaktivasi).
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { Card } from '@/components/ui';
import { ReportSummaryLine } from './ReportSummaryLine';
import type { ReportSummaryItem } from './ReportSummaryLine';

export interface ReportSortOption {
  value: string;
  label: string;
}

export interface ReportTabCardProps {
  /** Baris ringkasan (2026-08-26) di atas search/sort — opsional, tab yang
   * belum punya angka ringkasan cukup tidak mengisi ini. */
  summaryItems?: ReportSummaryItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Sort opsional — tab drilldown status (Reaktivasi) pakai dropdown
   * Status, bukan "Urutkan", jadi label/opsi tetap fleksibel lewat props. */
  sortValue: string;
  onSortChange: (value: string) => void;
  sortLabel: string;
  sortOptions: ReportSortOption[];
  /** Tabel (ResponsiveListView) — dirender TANPA padding tambahan, DataGrid
   * sudah full-bleed sampai tepi Card (pola sama Card+DataGrid halaman lain). */
  children: ReactNode;
}

export function ReportTabCard({
  summaryItems,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortValue,
  onSortChange,
  sortLabel,
  sortOptions,
  children,
}: ReportTabCardProps) {
  return (
    <Card>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {summaryItems && <ReportSummaryLine items={summaryItems} />}
        {/* justifyContent: space-between (2026-08-26) — search KIRI, sort
            KANAN, sesuai instruksi user (sebelumnya sejajar kiri berdua). */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />
          <TextField
            select
            size="small"
            label={sortLabel}
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            sx={{ width: { xs: '100%', sm: 200 } }}
          >
            {sortOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
      {children}
    </Card>
  );
}
