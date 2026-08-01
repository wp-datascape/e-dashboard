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
import type { DigestNotificationItem, MetricComparisonDetail, DigestBasis } from './digest.types'
import { getDict, triggerLabel, type Locale } from './i18n'
import { groupDigestBatches, formatDateRange } from './digest-batch.util'

const BRAND_COLOR: [number, number, number] = [37, 99, 235] // theme/palettes.ts blue.primary.light
const PAGE_W = 210 // A4 portrait, mm
const MARGIN = 14

function fmtIDR(val: number, dict: ReturnType<typeof getDict>): string {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}${dict.pdf.unitBillion}`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}${dict.pdf.unitMillion}`
  return `${sign}Rp ${abs.toLocaleString(dict.dateLocale)}`
}

function fmtIDRSigned(val: number, dict: ReturnType<typeof getDict>): string {
  if (val === 0) return fmtIDR(0, dict)
  return val > 0 ? `+${fmtIDR(val, dict)}` : fmtIDR(val, dict)
}

function fmtPct(pct: number | null, dict: ReturnType<typeof getDict>): string {
  if (pct === null) return dict.pdf.newBusiness
  const capped = pct > 999 ? 999 : pct < -999 ? -999 : pct
  const suffix = pct > 999 || pct < -999 ? '+' : ''
  return `${capped > 0 ? '+' : ''}${capped.toFixed(1)}%${suffix}`
}

function drawBrandHeader(doc: jsPDF, dict: ReturnType<typeof getDict>): void {
  doc.setFillColor(...BRAND_COLOR)
  doc.rect(0, 0, PAGE_W, 12, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(dict.pdf.brandName, MARGIN, 8)
  doc.setTextColor(0, 0, 0)
}

function drawFooters(doc: jsPDF, appBaseUrl: string | null, generatedAt: string, dict: ReturnType<typeof getDict>): void {
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
    doc.text(`${dict.pdf.generatedOn}: ${generatedAt}`, PAGE_W / 2, footerY, { align: 'center' })
    doc.text(`${dict.pdf.page} ${i} / ${totalPages}`, PAGE_W - MARGIN, footerY, { align: 'right' })
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

function detailRow(item: DigestNotificationItem, d: MetricComparisonDetail, dict: ReturnType<typeof getDict>): (string | number)[] {
  const status = d.revenue_alert || d.margin_alert ? dict.pdf.statusCritical : dict.pdf.statusNormal
  return [
    item.company_name,
    item.customer_name + (item.is_pareto ? ` (${dict.pdf.pareto})` : ''),
    metricCell(fmtIDR(d.comparison.revenue, dict), fmtIDR(d.comparison.margin, dict), true),
    metricCell(fmtIDR(d.current.revenue, dict), fmtIDR(d.current.margin, dict), false),
    metricCell(fmtIDRSigned(d.revenue_change_value, dict), fmtIDRSigned(d.margin_change_value, dict), false),
    metricPercentCell(fmtPct(d.revenue_change_pct, dict), fmtPct(d.margin_change_pct, dict)),
    status,
  ]
}

/**
 * Susun PDF digest dari daftar notifikasi 1 recipient. Item dikelompokkan per
 * "batch" (period_type+period_key+checkpoint, lihat groupDigestBatches) — biasanya
 * cuma 1 batch/hari, tapi 1 Januari bulanan+kuartal+semester+tahunan bisa tutup
 * bersamaan, jadi BISA lebih dari 1 batch dalam 1 email (masing-masing dapat kop
 * sendiri, BUKAN dicampur jadi 1 kop yang menyesatkan). Kop tiap batch (task016
 * §31, formal report style) SELALU eksplisit sebutkan jenis laporan + rentang
 * tanggal periode & pembanding — bukan cuma tersirat dari nama batch.
 */
export function buildDigestPdf(items: DigestNotificationItem[], appBaseUrl: string | null, locale: Locale = 'id'): Buffer {
  const dict = getDict(locale)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  drawBrandHeader(doc, dict)

  const generatedAt = new Date().toLocaleString(dict.dateLocale, { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

  let cursorY = 20
  let firstBatch = true
  for (const batch of groupDigestBatches(items)) {
    const label = triggerLabel(batch.periodType, batch.checkpoint, locale)

    if (!firstBatch) cursorY += 6
    firstBatch = false
    if (cursorY > 255) { doc.addPage(); cursorY = 20 }

    // Kop formal: judul laporan (bold, besar) + baris Periode/Pembanding
    // eksplisit di bawahnya — sebelumnya info rentang tanggal cuma muncul kecil
    // di caption section YoY, gampang terlewat & judulnya sendiri tidak
    // menyebut rentang tanggal sama sekali (task016 §31, "tambahkan penjelasan
    // laporan Bulanan, Periode Bulan apa tanggal berapa sampai tanggal berapa").
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(label, MARGIN, cursorY)
    cursorY += 5.5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 90, 90)
    doc.text(
      `${dict.pdf.periodCaption}: ${formatDateRange(batch.current.start, batch.current.end, dict.monthNames)}   •   ${dict.pdf.comparisonCaption}: ${formatDateRange(batch.comparison.start, batch.comparison.end, dict.monthNames)}`,
      MARGIN,
      cursorY,
    )
    doc.setTextColor(0, 0, 0)
    cursorY += 6

    // Basis SELALU YoY (task016 §28, sebelumnya PoP+YoY+YTD) — union 1 anggota
    // dipertahankan (lihat digest.types.ts) biar gampang extend kalau nanti
    // basis lain ditambahkan lagi.
    const sections: { basis: DigestBasis }[] = [{ basis: 'last_year' }]

    for (const section of sections) {
      // Cuma tampilkan customer yang Kritis DI BASIS INI SPESIFIK — customer yang
      // ter-trigger lewat basis LAIN (mis. YoY) tapi basis ini sendiri Normal TIDAK
      // ikut ditampilkan di sini. Sebelumnya semua customer ter-trigger ditampilkan
      // di ketiga section tanpa filter, jadi section PoP bisa berisi baris "Normal"
      // padahal maksud laporan ini murni daftar yang Kritis — salah, diperbaiki.
      const criticalItems = batch.items.filter(item => {
        const d = item.detail[section.basis]
        return d.revenue_alert || d.margin_alert
      })
      if (criticalItems.length === 0) continue

      if (cursorY > 260) { doc.addPage(); cursorY = 20 }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(dict.pdf.sectionYoY, MARGIN, cursorY)
      cursorY += 5

      autoTable(doc, {
        startY: cursorY,
        head: [[dict.pdf.company, dict.pdf.customer, dict.pdf.comparison, dict.pdf.period, dict.pdf.changeValue, dict.pdf.changePercent, dict.pdf.status]],
        body: criticalItems.map(item => detailRow(item, item.detail[section.basis], dict)),
        headStyles: { fillColor: BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        // Kolom angka rata KIRI (permintaan user 2026-07-31, revisi dari rata
        // kanan sebelumnya) — cuma Status yang tetap di tengah.
        columnStyles: {
          6: { halign: 'center' },
        },
        margin: { left: MARGIN, right: MARGIN, top: 16 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6 && data.cell.raw === dict.pdf.statusCritical) {
            data.cell.styles.textColor = [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      // @ts-expect-error — lastAutoTable diinject oleh plugin autoTable saat runtime, tidak ada di tipe jsPDF dasar
      cursorY = doc.lastAutoTable.finalY + 6
    }
  }

  drawFooters(doc, appBaseUrl, generatedAt, dict)

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
