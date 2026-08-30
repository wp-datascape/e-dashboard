/**
 * Excel Template — branded header untuk semua export .xlsx di Executive
 * Dashboard. Import helper ini di setiap file export spesifik (pola sama
 * persis `utils/pdf/template.ts`), jangan isi logika bisnis di sini.
 *
 * Pakai ExcelJS (2026-08-29, ganti dari SheetJS Community Edition) — CE
 * SheetJS TIDAK BISA menulis style teks (bold/warna/fill), itu fitur
 * berbayar (SheetJS Pro), dicek langsung ke dokumentasi resmi. ExcelJS
 * mendukung styling penuh gratis, jadi header di sini BISA sama persis
 * gaya bar biru `utils/pdf/template.ts`. Paket ExcelJS punya entry
 * `"browser"` sendiri di package.json (bundel sudah di-browserify), Vite
 * otomatis pakai itu — tidak perlu plugin polyfill Node tambahan.
 *
 * `workbook.xlsx.writeBuffer()` ASYNC (beda dari `XLSX.writeFile` yang
 * sinkron) — `exportToExcel` karena itu me-return Promise, caller WAJIB
 * `await` atau `.catch()` sendiri kalau mau tangani error (mis. quota
 * storage browser penuh).
 */
import ExcelJS from 'exceljs';
import { formatDateTimeID } from '@/utils/date';

export const APP_NAME = 'Executive Dashboard';
// Sama persis BRAND_COLOR biru `utils/pdf/template.ts` (RGB 37,99,235 —
// blue-600), format ARGB (alpha channel FF = solid) yang dipakai ExcelJS.
export const BRAND_COLOR_ARGB = 'FF2563EB';

export interface ExcelColumn {
  /** Judul kolom, baris header tabel data. */
  header: string;
  /** Key pengambilan nilai dari tiap row (`row[key]`). */
  key: string;
  /** Lebar kolom dalam karakter (opsional, default dari panjang header). */
  width?: number;
  /** Format tampilan angka Excel — mis. '0.0%' utk persentase (nilai/rumus
   * WAJIB rasio 0-1, Excel sendiri yang kalikan 100 utk tampilan, JANGAN
   * kalikan manual — lihat JSDoc `utils/excel.ts` backend). */
  numFmt?: string;
  /** Kalau diisi, sel kolom ini jadi RUMUS Excel LIVE (2026-08-30, sinkron
   * dgn kapabilitas backend `utils/excel.ts` — sama persis, lihat JSDoc di
   * situ untuk penjelasan lengkap). Dipanggil per baris dgn helper
   * `ref(key)` yg mengembalikan referensi cell kolom LAIN di baris yg SAMA
   * (mis. `ref('gp')` → "H11"). Return string TANPA tanda "=" di depan. */
  formula?: (ref: (key: string) => string) => string;
}

/** Index 0-based → huruf kolom Excel (A, B, ..., Z, AA, AB, ...). */
function columnLetter(index0: number): string {
  let n = index0 + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export interface ExcelExportOptions {
  /** Nama sheet Excel (opsional, default 'Data') — otomatis dipotong 31
   * karakter & karakter terlarang (`: \ / ? * [ ]`) dibuang, batas resmi
   * Excel. */
  sheetName?: string;
  /** Judul laporan, baris ke-2 (di bawah nama app), mis. "GP Breakdown —
   * Agustus 2026". */
  title: string;
  /** Baris info tambahan opsional (mis. filter yang aktif saat export),
   * ditulis "Label: Nilai" satu baris per item, SEBELUM tabel data. */
  meta?: [string, string][];
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  /** Nama file diunduh, WAJIB berakhiran `.xlsx`. */
  filename: string;
}

/** Excel sheet name: max 31 char, tanpa karakter `: \ / ? * [ ]`. */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Data';
}

/**
 * Bangun 1 worksheet dengan header brand (bar biru "Executive Dashboard" +
 * judul laporan + "Dicetak dari" URL + waktu cetak) di baris-baris awal,
 * tabel data di bawahnya (header kolom bold + freeze pane). Dipisah dari
 * `exportToExcel` supaya caller yang butuh multi-sheet (mis. 1 tab per
 * kategori) bisa panggil ini berkali-kali ke worksheet berbeda dalam 1
 * workbook.
 */
export function buildExcelSheet(workbook: ExcelJS.Workbook, options: ExcelExportOptions): ExcelJS.Worksheet {
  const url = window.location.href;
  const printedAt = formatDateTimeID(new Date());
  const colCount = Math.max(options.columns.length, 1);
  const lastCol = columnLetter(colCount - 1);

  const sheet = workbook.addWorksheet(sanitizeSheetName(options.sheetName ?? 'Data'));

  // Baris 1 — nama app, bar biru sama persis PDF.
  sheet.mergeCells(`A1:${lastCol}1`);
  const appCell = sheet.getCell('A1');
  appCell.value = APP_NAME;
  appCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  appCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR_ARGB } };
  appCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 22;

  // Baris 2 — judul laporan.
  sheet.mergeCells(`A2:${lastCol}2`);
  const titleCell = sheet.getCell('A2');
  titleCell.value = options.title;
  titleCell.font = { bold: true, size: 12 };

  // Baris 3-4 — "Dicetak dari" URL + waktu cetak, abu-abu kecil (sama
  // gaya footer PDF).
  sheet.mergeCells(`A3:${lastCol}3`);
  sheet.getCell('A3').value = `Dicetak dari: ${url}`;
  sheet.getCell('A3').font = { size: 9, color: { argb: 'FF666666' } };
  sheet.mergeCells(`A4:${lastCol}4`);
  sheet.getCell('A4').value = `Waktu cetak: ${printedAt}`;
  sheet.getCell('A4').font = { size: 9, color: { argb: 'FF666666' } };

  let nextRow = 6; // baris 5 dikosongkan sbg spasi
  if (options.meta?.length) {
    for (const [label, val] of options.meta) {
      sheet.mergeCells(`A${nextRow}:${lastCol}${nextRow}`);
      sheet.getCell(`A${nextRow}`).value = `${label}: ${val}`;
      sheet.getCell(`A${nextRow}`).font = { size: 9, color: { argb: 'FF666666' } };
      nextRow += 1;
    }
    nextRow += 1; // spasi sebelum tabel
  }

  const headerRowNum = nextRow;
  sheet.columns = options.columns.map((c) => ({
    key: c.key,
    width: c.width ?? Math.max(c.header.length + 2, 12),
  }));
  for (const c of options.columns) {
    if (c.numFmt) sheet.getColumn(c.key).numFmt = c.numFmt;
  }
  // `worksheet.columns` (di atas) reset row 1 sbg header otomatis ExcelJS —
  // TIDAK dipakai di sini krn header brand sudah custom di row 1-4, jadi
  // header kolom tabel ditulis manual sbg row biasa di `headerRowNum`.
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.values = options.columns.map((c) => c.header);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100

  const colIndexByKey = new Map(options.columns.map((c, i) => [c.key, i]));
  options.rows.forEach((row, i) => {
    const rowNumber = headerRowNum + 1 + i;
    const ref = (key: string) => {
      const idx = colIndexByKey.get(key);
      if (idx === undefined) throw new Error(`excel/template.ts: kolom '${key}' tidak ditemukan utk referensi formula`);
      return `${columnLetter(idx)}${rowNumber}`;
    };
    const rowValues: Record<string, unknown> = {};
    for (const c of options.columns) {
      rowValues[c.key] = c.formula
        ? { formula: c.formula(ref), result: row[c.key] ?? 0 }
        : (row[c.key] ?? '');
    }
    sheet.addRow(rowValues);
  });

  // Freeze pane di baris SETELAH header kolom tabel (row 1 kosongkan
  // xSplit, brand+judul tetap kelihatan sekilas TAPI ikut discroll —
  // yang di-freeze cuma header kolom tabelnya, pola umum spreadsheet
  // laporan panjang).
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNum }];

  return sheet;
}

/**
 * Export 1 tabel ke file .xlsx dan langsung trigger download di browser.
 * Dipanggil dari file export spesifik per halaman/metrik (pola sama persis
 * `exportGpBreakdownPdf`), contoh:
 *
 * ```ts
 * await exportToExcel({
 *   title: `GP Breakdown — ${month}`,
 *   columns: [
 *     { header: 'Customer', key: 'customer_name' },
 *     { header: 'GP', key: 'gp' },
 *   ],
 *   rows: data.rows,
 *   filename: `gp-breakdown-${month}.xlsx`,
 * });
 * ```
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  workbook.created = new Date();

  buildExcelSheet(workbook, options);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
