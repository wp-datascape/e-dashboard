/**
 * pdf.service.ts — susun PDF digest laporan alert Analisis (task016 §23).
 *
 * jsPDF + jspdf-autotable JALAN DI NODE/BUN (bukan cuma browser) selama pakai
 * mode data JS langsung (head/body array, BUKAN opsi `html:` yang butuh DOM) —
 * dites manual sebelum implementasi ini ditulis. Gaya visual (header biru,
 * footer watermark) SENGAJA mirror `frontend/src/utils/pdf/template.ts` (dipakai
 * export GP Breakdown dkk) supaya semua PDF di app konsisten satu identitas,
 * walau ini instance jsPDF terpisah di backend (tidak reuse kode React/DOM).
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { resolveTriggerRanges } from '@/features/analisis/period.util'
import { triggerLabel, type DigestNotificationItem, type MetricComparisonDetail, type DigestBasis } from './digest.types'

const BRAND_COLOR: [number, number, number] = [37, 99, 235] // theme/palettes.ts blue.primary.light
const PAGE_W = 210 // A4 portrait, mm
const MARGIN = 14
const MID_MONTH_DAY = 14 // sinkron dgn scheduler.ts MID_MONTH_CHECKPOINT_DAY

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [, em, ed] = end.split('-').map(Number)
  if (sm === em) return `${sd}–${ed} ${MONTH_NAMES_ID[sm - 1]} ${sy}`
  return `${sd} ${MONTH_NAMES_ID[sm - 1]} – ${ed} ${MONTH_NAMES_ID[em - 1]} ${sy}`
}

function fmtIDR(val: number): string {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`
}

function fmtIDRSigned(val: number): string {
  if (val === 0) return fmtIDR(0)
  return val > 0 ? `+${fmtIDR(val)}` : fmtIDR(val)
}

function fmtPct(pct: number | null): string {
  if (pct === null) return 'Baru'
  const capped = pct > 999 ? 999 : pct < -999 ? -999 : pct
  const suffix = pct > 999 || pct < -999 ? '+' : ''
  return `${capped > 0 ? '+' : ''}${capped.toFixed(1)}%${suffix}`
}

const BASIS_LABEL: Record<DigestBasis, string> = {
  previous_period: 'Previous Period (PoP)',
  last_year: 'Year-over-Year (YoY)',
  ytd: 'Year-to-Date (YTD)',
}

function drawBrandHeader(doc: jsPDF): void {
  doc.setFillColor(...BRAND_COLOR)
  doc.rect(0, 0, PAGE_W, 12, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Executive Dashboard', MARGIN, 8)
  doc.setTextColor(0, 0, 0)
}

function drawFooters(doc: jsPDF, appBaseUrl: string | null, generatedAt: string): void {
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerY = 290
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.setDrawColor(200, 200, 200)
    doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3)
    doc.text(appBaseUrl ?? '', MARGIN, footerY)
    doc.text(`Digenerate pada: ${generatedAt}`, PAGE_W / 2, footerY, { align: 'center' })
    doc.text(`Halaman ${i} / ${totalPages}`, PAGE_W - MARGIN, footerY, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}

// Kolom PERTAMA (Pembanding) tampilkan label "Rev:"/"GP:", kolom sesudahnya
// (Periode, Perubahan Nilai) cukup angka polos — posisi vertikal (Rev di atas,
// GP di bawah) KONSISTEN di semua kolom jadi tetap terbaca tanpa label
// berulang tiap kolom (task016 §25, permintaan user "kurangi pengulangan").
function metricCell(rev: string, mar: string, showLabels: boolean): string {
  return showLabels ? `Rev: ${rev}\nGP: ${mar}` : `${rev}\n${mar}`
}

// Kolom Perubahan (%) TETAP pakai label GM (Gross Margin, rasio) — beda dari
// kolom Rupiah lain yang pakai GP (Gross Profit, angka absolut). Cuma 1
// kolom, tidak ada masalah pengulangan, jadi label tetap ditampilkan penuh.
function metricPercentCell(rev: string, mar: string): string {
  return `Rev: ${rev}\nGM: ${mar}`
}

function detailRow(item: DigestNotificationItem, d: MetricComparisonDetail): (string | number)[] {
  const status = d.revenue_alert || d.margin_alert ? 'Kritis' : 'Normal'
  return [
    item.company_name,
    item.customer_name + (item.is_pareto ? ' (Pareto)' : ''),
    metricCell(fmtIDR(d.comparison.revenue), fmtIDR(d.comparison.margin), true),
    metricCell(fmtIDR(d.current.revenue), fmtIDR(d.current.margin), false),
    metricCell(fmtIDRSigned(d.revenue_change_value), fmtIDRSigned(d.margin_change_value), false),
    metricPercentCell(fmtPct(d.revenue_change_pct), fmtPct(d.margin_change_pct)),
    status,
  ]
}

function groupKey(item: DigestNotificationItem): string {
  return `${item.period_type}:${item.period_key}:${item.checkpoint}`
}

/**
 * Susun PDF digest dari daftar notifikasi 1 recipient. Item dikelompokkan per
 * "batch" (period_type+period_key+checkpoint) dulu — biasanya cuma 1 batch/hari,
 * tapi 1 Januari bulanan+kuartal+semester+tahunan bisa tutup bersamaan, jadi
 * BISA lebih dari 1 batch dalam 1 email (masing-masing dapat caption sendiri,
 * BUKAN dicampur jadi 1 caption yang menyesatkan). Tiap batch berisi 3 tabel
 * (PoP/YoY/YTD), format identik dgn contoh yang diminta user (task016 §23) —
 * cuma isi rentang tanggalnya beda sesuai jenis trigger.
 */
export function buildDigestPdf(items: DigestNotificationItem[], appBaseUrl: string | null): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  drawBrandHeader(doc)

  const generatedAt = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

  const batches = new Map<string, DigestNotificationItem[]>()
  for (const item of items) {
    const key = groupKey(item)
    const list = batches.get(key) ?? []
    list.push(item)
    batches.set(key, list)
  }

  let cursorY = 20
  let firstBatch = true
  for (const batchItems of batches.values()) {
    const [sample] = batchItems
    const ranges = resolveTriggerRanges(sample.period_type, sample.period_key, sample.checkpoint, MID_MONTH_DAY)
    const label = triggerLabel(sample.period_type, sample.checkpoint)

    if (!firstBatch) cursorY += 6
    firstBatch = false
    if (cursorY > 260) { doc.addPage(); cursorY = 20 }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(label, MARGIN, cursorY)
    cursorY += 6

    const sections: { basis: DigestBasis; current: { start: string; end: string }; comparison: { start: string; end: string } }[] = [
      { basis: 'previous_period', current: ranges.current, comparison: ranges.previous },
      { basis: 'last_year', current: ranges.current, comparison: ranges.yoy },
      { basis: 'ytd', current: ranges.ytd, comparison: ranges.ytdYoy },
    ]

    for (const section of sections) {
      // Cuma tampilkan customer yang Kritis DI BASIS INI SPESIFIK — customer yang
      // ter-trigger lewat basis LAIN (mis. YoY) tapi basis ini sendiri Normal TIDAK
      // ikut ditampilkan di sini. Sebelumnya semua customer ter-trigger ditampilkan
      // di ketiga section tanpa filter, jadi section PoP bisa berisi baris "Normal"
      // padahal maksud laporan ini murni daftar yang Kritis — salah, diperbaiki.
      const criticalItems = batchItems.filter(item => {
        const d = item.detail[section.basis]
        return d.revenue_alert || d.margin_alert
      })
      if (criticalItems.length === 0) continue

      if (cursorY > 260) { doc.addPage(); cursorY = 20 }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(BASIS_LABEL[section.basis], MARGIN, cursorY)
      cursorY += 4.5

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90, 90, 90)
      const caption = `Pembanding: ${formatDateRange(section.comparison.start, section.comparison.end)} • Periode: ${formatDateRange(section.current.start, section.current.end)}`
      doc.text(caption, MARGIN, cursorY)
      doc.setTextColor(0, 0, 0)
      cursorY += 3

      autoTable(doc, {
        startY: cursorY,
        head: [['Perusahaan', 'Customer', 'Pembanding', 'Periode', 'Perubahan Nilai', 'Perubahan (%)', 'Status']],
        body: criticalItems.map(item => detailRow(item, item.detail[section.basis])),
        headStyles: { fillColor: BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        // Kolom angka (Pembanding/Periode/Perubahan Nilai/Perubahan %) rata kanan
        // biar besaran gampang dibandingkan sekilas (task016 §25) — kolom nama
        // (Perusahaan/Customer) tetap rata kiri, Status di tengah.
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' },
        },
        margin: { left: MARGIN, right: MARGIN, top: 16 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6 && data.cell.raw === 'Kritis') {
            data.cell.styles.textColor = [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      // @ts-expect-error — lastAutoTable diinject oleh plugin autoTable saat runtime, tidak ada di tipe jsPDF dasar
      cursorY = doc.lastAutoTable.finalY + 6
    }
  }

  drawFooters(doc, appBaseUrl, generatedAt)

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
