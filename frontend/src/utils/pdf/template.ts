/**
 * PDF Template — branded header & footer untuk semua export di Executive Dashboard.
 * Import helper ini di setiap file export spesifik, jangan isi logika bisnis di sini.
 */
import jsPDF from 'jspdf';
import { formatDateTimeID } from '@/utils/date';

export const PDF_MARGIN  = 14;        // mm, kiri & kanan
export const PDF_PAGE_W  = 210;       // A4 portrait
export const PDF_FOOTER_Y = 290;      // posisi Y footer dari atas
export const APP_NAME    = 'Executive Dashboard';
export const BRAND_COLOR: [number, number, number] = [37, 99, 235]; // blue-600

/** Buat dokumen PDF baru dengan header branding di halaman pertama. */
export function createDocument(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

/**
 * Gambar header biru di atas halaman (tinggi 12mm).
 * Dipanggil sekali di awal, BUKAN di dalam didDrawPage.
 */
export function drawHeader(doc: jsPDF): void {
  const url = window.location.origin;

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PDF_PAGE_W, 12, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(APP_NAME, PDF_MARGIN, 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(url, PDF_PAGE_W - PDF_MARGIN, 8, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

/**
 * Gambar section judul dokumen setelah header.
 * Mengembalikan posisi Y berikutnya.
 */
export function drawTitle(doc: jsPDF, title: string, startY = 22): number {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, PDF_MARGIN, startY);
  return startY + 3;
}

/**
 * Gambar daftar meta key:value.
 * Mengembalikan posisi Y setelah baris terakhir.
 */
export function drawMeta(doc: jsPDF, items: [string, string][], startY: number): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  let y = startY + 4;
  for (const [label, val] of items) {
    doc.text(`${label}  :  ${val}`, PDF_MARGIN, y);
    y += 4.5;
  }

  doc.setTextColor(0, 0, 0);
  return y;
}

/**
 * Footer handler untuk dipakai di `didDrawPage` autoTable.
 * Gambar garis tipis + URL kiri, tanggal tengah, nomor halaman kanan.
 */
export function drawFooter(doc: jsPDF, pageNum: number, generatedAt: string): void {
  const totalPages = doc.getNumberOfPages();
  const url        = window.location.origin;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.setDrawColor(200, 200, 200);
  doc.line(PDF_MARGIN, PDF_FOOTER_Y - 3, PDF_PAGE_W - PDF_MARGIN, PDF_FOOTER_Y - 3);

  doc.text(url,                          PDF_MARGIN,          PDF_FOOTER_Y);
  doc.text(`Digenerate pada: ${generatedAt}`, PDF_PAGE_W / 2, PDF_FOOTER_Y, { align: 'center' });
  doc.text(`Halaman ${pageNum} / ${totalPages}`, PDF_PAGE_W - PDF_MARGIN, PDF_FOOTER_Y, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

// Format Indonesia dd-mm-yyyy — dipusatkan di utils/date.ts (2026-08-19)
/** Format tanggal-waktu lokal untuk footer. */
export function nowLocale(): string {
  return formatDateTimeID(new Date());
}
