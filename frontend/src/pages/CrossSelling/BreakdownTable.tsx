import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import { formatRupiah } from '@/utils/format';
import type { CrossSellingData } from '@/types/metrics';

// Tabel Breakdown (task029.md §28.10) — dipusatkan 2026-08-21 (awalnya lokal
// di M1CrossSelling.tsx, sekarang dipakai M1 DAN M2 — "M1 jadi standar
// layout default utk semua KPI", tabel ini bagian dari standar itu, bukan
// kode duplikat per halaman). `data`/`yoyData` SAMA PERSIS shape yang
// dipakai M1 (fetch utama + fetch YoY period_end -1 tahun untuk KpiHeader),
// TIDAK ADA fetch baru — komponen ini murni presentasi + client-side
// search/sort dari data yang SUDAH ada di tangan caller.
const CROSS_SELL_STATUS_COLOR: Record<string, StatusChipColor> = {
  new: 'primary', increased: 'success', stable: 'default', decreased: 'error',
};

interface Props {
  data: CrossSellingData | undefined;
  yoyData: CrossSellingData | undefined;
  isLoading: boolean;
  /** Info periode+granularitas di header tabel (2026-08-29, instruksi user:
   * "kenapa layout tabelnya beda [dari tabel lain]" — komponen ini dulu
   * bikin sendiri Box+TextField search/sort, TIDAK memakai search/sort
   * bawaan ResponsiveListView spt tabel Laporan lain. Disamakan di sini,
   * lihat JSDoc `ResponsiveListViewProps.search`). Opsional — caller lama
   * (kalau ada) yang belum kirim ini tetap jalan, cuma tanpa info periode. */
  periodLabel?: string;
}

export function BreakdownTable({ data, yoyData, isLoading, periodLabel }: Props) {
  const { t } = useTranslation();

  const breakdownColumns: GridColDef[] = useMemo(() => [
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1, minWidth: 180 },
    { field: 'branch', headerName: t('common.branch'), width: 130 },
    { field: 'division', headerName: t('customers.detail.division'), width: 130 },
    { field: 'channel', headerName: t('customers.detail.channel'), width: 150 },
    { field: 'category_count', headerName: t('crossSelling.colCurrentCategoryCount'), width: 130, type: 'number' },
    { field: 'yoy_category_count', headerName: t('crossSelling.colYoyCategoryCount'), width: 150, type: 'number', valueFormatter: (v: number | null) => (v ?? 0).toLocaleString('id-ID') },
    { field: 'category_change', headerName: t('crossSelling.colCategoryChange'), width: 150, type: 'number', valueFormatter: (v: number | null) => (v == null ? '0' : `${v >= 0 ? '+' : ''}${v}`) },
    { field: 'total_revenue', headerName: t('crossSelling.colTotalRevenue'), width: 160, type: 'number', valueFormatter: (v: number) => formatRupiah(v) },
    { field: 'yoy_total_revenue', headerName: t('crossSelling.colRevenueYoy'), width: 160, type: 'number', valueFormatter: (v: number | null) => formatRupiah(v ?? 0) },
    {
      field: 'cross_sell_status', headerName: t('crossSelling.colCrossSellStatus'), width: 130, sortable: false,
      renderCell: (p) => <StatusChip label={t(`crossSelling.crossSellStatus${(p.value as string).charAt(0).toUpperCase()}${(p.value as string).slice(1)}`)} color={CROSS_SELL_STATUS_COLOR[p.value as string] ?? 'default'} />,
    },
  ], [t]);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'category_desc' | 'revenue_desc'>('name');

  // YoY per customer — reuse yoyData yang SUDAH di-fetch caller (period_end
  // digeser -1 tahun, awalnya cuma buat KpiHeader), TIDAK ada fetch baru.
  const yoyByCustomer = useMemo(() => {
    const map = new Map<number, { category_count: number; total_revenue: number }>();
    for (const r of yoyData?.detail ?? []) map.set(r.customer_id, { category_count: r.category_count, total_revenue: r.total_revenue });
    return map;
  }, [yoyData?.detail]);

  const rows = useMemo(() => {
    const withYoy = (data?.detail ?? []).map((r) => {
      const yoy = yoyByCustomer.get(r.customer_id);
      // "New" = customer TIDAK ADA di populasi Existing periode yang sama
      // setahun lalu (tidak ada baseline utk dibandingkan) — BUKAN customer
      // baru dalam arti definisi New/Existing halaman ini (populasi tabel
      // ini SUDAH cuma Existing, lihat cteExistingCustomersByPeriod).
      const yoyCategoryCount = yoy?.category_count ?? null;
      const yoyTotalRevenue = yoy?.total_revenue ?? null;
      const categoryChange = yoyCategoryCount != null ? r.category_count - yoyCategoryCount : null;
      const crossSellStatus: 'new' | 'increased' | 'stable' | 'decreased' =
        yoyCategoryCount == null ? 'new'
          : r.category_count > yoyCategoryCount ? 'increased'
            : r.category_count < yoyCategoryCount ? 'decreased' : 'stable';
      return {
        ...r,
        yoy_category_count: yoyCategoryCount,
        yoy_total_revenue: yoyTotalRevenue,
        category_change: categoryChange,
        cross_sell_status: crossSellStatus,
      };
    });
    const q = search.trim().toLowerCase();
    const filtered = q
      ? withYoy.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : withYoy;
    const sorted = [...filtered];
    if (sort === 'category_desc') sorted.sort((a, b) => b.category_count - a.category_count);
    else if (sort === 'revenue_desc') sorted.sort((a, b) => b.total_revenue - a.total_revenue);
    else sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    return sorted;
  }, [data?.detail, yoyByCustomer, search, sort]);

  return (
    <ResponsiveListView
      rows={rows.map((r) => ({ ...r, id: r.customer_id }))}
      columns={breakdownColumns}
      loading={isLoading}
      height={480}
      pageSize={25}
      pageSizeOptions={[25, 50, 100]}
      emptyMessage={t('crossSelling.m2EmptyMessage')}
      mobileFields={['customer_name', 'category_count', 'total_revenue', 'cross_sell_status']}
      search={{ value: search, onChange: setSearch, placeholder: t('crossSelling.tableSearchPlaceholder') }}
      periodLabel={periodLabel}
      sort={{
        value: sort,
        onChange: (v) => setSort(v as typeof sort),
        label: t('crossSelling.tableSortLabel'),
        options: [
          { value: 'name', label: t('crossSelling.tableSortName') },
          { value: 'category_desc', label: t('crossSelling.tableSortCategoryDesc') },
          { value: 'revenue_desc', label: t('crossSelling.tableSortRevenueDesc') },
        ],
      }}
    />
  );
}
