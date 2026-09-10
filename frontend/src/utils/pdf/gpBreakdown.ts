import autoTable from 'jspdf-autotable';
import type { GpBreakdownData } from '@/types/metrics';
import { formatRupiah } from '@/utils/format';
import {
  createDocument,
  drawHeader,
  drawTitle,
  drawMeta,
  drawFooter,
  nowLocale,
  BRAND_COLOR,
} from './template';

export function exportGpBreakdownPdf(month: string, data: GpBreakdownData): void {
  const avgGp = data.total_existing > 0 ? data.total_gp / data.total_existing : 0;
  const generatedAt = nowLocale();

  const doc = createDocument();
  drawHeader(doc);

  const afterTitle = drawTitle(doc, `GP Breakdown — ${month}`);
  const afterMeta  = drawMeta(doc, [
    ['Gross Profit Existing Customer', formatRupiah(data.total_gp)],
    ['Total Existing Customer',        String(data.total_existing)],
    ['Avg GP/Customer',                formatRupiah(avgGp)],
    ['Median threshold',               formatRupiah(data.median_threshold)],
    ['Existing bertransaksi',          String(data.rows.length)],
  ], afterTitle);

  autoTable(doc, {
    startY: afterMeta + 3,
    head: [['#', 'Customer', 'Kode', 'GP', '% Total', 'Tier']],
    body: data.rows.map((r) => [
      r.ranking,
      r.customer_name,
      r.customer_code ?? '—',
      formatRupiah(r.gp),
      `${r.gp_pct}%`,
      r.tier,
    ]),
    headStyles:         { fillColor: BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:         { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin:             { left: 14, right: 14 },
    didDrawPage: (d) => drawFooter(doc, d.pageNumber, generatedAt),
  });

  doc.save(`gp-breakdown-${month}.pdf`);
}
