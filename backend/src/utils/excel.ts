/**
 * Excel Template — branded header untuk semua export .xlsx yang digenerate
 * BACKEND (bukan client-side). Mirror `frontend/src/utils/excel/template.ts`
 * (identitas visual sama — nama app, bar biru, "Dicetak dari"+waktu cetak),
 * tapi instance ExcelJS TERPISAH (backend tidak reuse kode frontend).
 *
 * Dipakai utk endpoint export yang query LANGSUNG ke DB tanpa batas paginasi
 * (2026-08-30, instruksi user: export sesuai filter aktif, satu query,
 * bukan lewat frontend fetch-semua-halaman-lalu-build) — beda dari export
 * client-side (`frontend/src/utils/excel/template.ts`) yang cuma
 * memformat data yang SUDAH ada di tangan frontend (1 halaman tabel).
 *
 * Skala data (dicek): tabel laporan realistis ribuan baris per company/
 * periode, BUKAN jutaan — `workbook.xlsx.writeBuffer()` (build semua di
 * memori) cukup. Streaming writer (`ExcelJS.stream.xlsx.WorkbookWriter`,
 * commit per-baris) baru perlu kalau nanti ada kasus "export semua company
 * semua periode tanpa batas" — JANGAN pindah ke situ tanpa kebutuhan nyata
 * (over-engineering), dicek dulu ke dokumentasi resmi ExcelJS soal ambang
 * ini (~10rb baris / ~10MB) sebelum tulis catatan ini.
 */
import ExcelJS from 'exceljs'

export const APP_NAME = 'Executive Dashboard'
// Sama persis BRAND_COLOR biru frontend template + pdf.service.ts (RGB
// 37,99,235 — blue-600), format ARGB yang dipakai ExcelJS.
export const BRAND_COLOR_ARGB = 'FF2563EB'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  /** Format tampilan angka Excel (2026-08-30) — mis. '0.0%' utk persentase
   * (nilai/rumus WAJIB rasio 0-1, Excel SENDIRI yang kalikan 100 utk
   * tampilan, JANGAN kalikan 100 manual di data/rumus kalau numFmt ini
   * dipakai — dobel kali 100 = hasil salah "560%"). Diterapkan level
   * KOLOM (`sheet.getColumn(key).numFmt`), bukan per-sel, cukup 1x. */
  numFmt?: string
  /** Kalau diisi, sel kolom ini jadi RUMUS Excel LIVE (2026-08-30, laporan
   * user: "kolom GP Margin harusnya rumus, bukan teks hasil hitung server")
   * — bukan angka statis. Dipanggil per baris dgn helper `ref(key)` yg
   * mengembalikan referensi cell kolom LAIN di baris yg SAMA (mis.
   * `ref('total_gp')` → "H11"), BUKAN hardcode huruf kolom manual (supaya
   * tidak salah kalau urutan `columns` berubah). Return string TANPA tanda
   * "=" di depan (konvensi ExcelJS, prefix ditambah otomatis oleh Excel).
   * `row[key]` (nilai yg SUDAH dihitung server, TETAP dikirim dari caller
   * spt biasa) dipakai sbg cached `result` — ExcelJS TIDAK mengeksekusi
   * rumus sendiri, hasilnya wajib disuplai manual (dicek ke docs resmi
   * ExcelJS: "for Formula values, the result must be provided manually").
   * Excel HITUNG ULANG rumusnya begitu file dibuka/di-edit, jadi `result`
   * di sini cuma tampilan awal sebelum Excel sempat recalc, boleh sedikit
   * beda kalau caller salah hitung — bukan sumber kebenaran, cuma cache. */
  formula?: (ref: (key: string) => string) => string
}

/** Index 0-based → huruf kolom Excel (A, B, ..., Z, AA, AB, ...). */
function columnLetter(index0: number): string {
  let n = index0 + 1
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export interface ExcelExportOptions {
  sheetName?: string
  title: string
  /** URL request yang menghasilkan export ini (`c.req.url`, LENGKAP dgn
   * query string filter) — beda dari versi frontend yang pakai
   * `window.location.href` (URL halaman, bukan endpoint API). */
  printedFrom: string
  meta?: [string, string][]
  columns: ExcelColumn[]
  rows: Record<string, unknown>[]
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Data'
}

/** "DD-MM-YYYY HH:mm", WIB eksplisit (server BELUM TENTU timezone Jakarta,
 * beda dari frontend yang otomatis pakai jam lokal browser user — pola
 * sama `pdf.service.ts` drawFooters yg juga eksplisit `Asia/Jakarta`,
 * jangan pakai `Date.getHours()` polos di backend). */
function nowJakarta(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`
}

/** "YYYY-MM-DD" → "DD-MM-YYYY" (2026-08-30, laporan user: "format date ini
 * bukan format indonesia" — meta "Periode" di export dulu nampilin ISO
 * mentah `date_from`/`date_to` apa adanya, sekarang disamakan gaya dgn
 * "Waktu cetak" (`nowJakarta` di atas). String manipulation murni, BUKAN
 * lewat `Date` object — inputnya sudah tanggal murni tanpa jam, parse ke
 * Date lalu format ulang cuma buka risiko pergeseran timezone yang tidak
 * perlu utk kasus sesederhana ini. */
export function formatDateID(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}-${m}-${y}`
}

/**
 * Bangun workbook + worksheet dengan header brand, lalu return Buffer siap
 * dikirim sbg response HTTP. Satu fungsi (bukan dipecah build+download spt
 * versi frontend) krn backend tidak ada konsep "trigger download DOM" —
 * caller (handler) yang urus Response/headers.
 */
export async function buildExcelBuffer(options: ExcelExportOptions): Promise<Buffer> {
  const printedAt = nowJakarta()
  const colCount = Math.max(options.columns.length, 1)
  const lastCol = columnLetter(colCount - 1)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = APP_NAME
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sanitizeSheetName(options.sheetName ?? 'Data'))

  sheet.mergeCells(`A1:${lastCol}1`)
  const appCell = sheet.getCell('A1')
  appCell.value = APP_NAME
  appCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  appCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR_ARGB } }
  appCell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 22

  sheet.mergeCells(`A2:${lastCol}2`)
  const titleCell = sheet.getCell('A2')
  titleCell.value = options.title
  titleCell.font = { bold: true, size: 12 }

  sheet.mergeCells(`A3:${lastCol}3`)
  sheet.getCell('A3').value = `Dicetak dari: ${options.printedFrom}`
  sheet.getCell('A3').font = { size: 9, color: { argb: 'FF666666' } }
  sheet.mergeCells(`A4:${lastCol}4`)
  sheet.getCell('A4').value = `Waktu cetak: ${printedAt}`
  sheet.getCell('A4').font = { size: 9, color: { argb: 'FF666666' } }

  let nextRow = 6
  if (options.meta?.length) {
    for (const [label, val] of options.meta) {
      sheet.mergeCells(`A${nextRow}:${lastCol}${nextRow}`)
      sheet.getCell(`A${nextRow}`).value = `${label}: ${val}`
      sheet.getCell(`A${nextRow}`).font = { size: 9, color: { argb: 'FF666666' } }
      nextRow += 1
    }
    nextRow += 1
  }

  const headerRowNum = nextRow
  sheet.columns = options.columns.map((c) => ({
    key: c.key,
    width: c.width ?? Math.max(c.header.length + 2, 12),
  }))
  for (const c of options.columns) {
    if (c.numFmt) sheet.getColumn(c.key).numFmt = c.numFmt
  }
  const headerRow = sheet.getRow(headerRowNum)
  headerRow.values = options.columns.map((c) => c.header)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

  // colIndexByKey — dipakai `ref(key)` di kolom formula, resolve huruf
  // kolom dari POSISI di `options.columns` (bukan hardcode), lihat JSDoc
  // ExcelColumn.formula.
  const colIndexByKey = new Map(options.columns.map((c, i) => [c.key, i]))
  options.rows.forEach((row, i) => {
    const rowNumber = headerRowNum + 1 + i
    const ref = (key: string) => {
      const idx = colIndexByKey.get(key)
      if (idx === undefined) throw new Error(`excel.ts: kolom '${key}' tidak ditemukan utk referensi formula`)
      return `${columnLetter(idx)}${rowNumber}`
    }
    const rowValues: Record<string, unknown> = {}
    for (const c of options.columns) {
      rowValues[c.key] = c.formula
        ? { formula: c.formula(ref), result: row[c.key] ?? 0 }
        : (row[c.key] ?? '')
    }
    sheet.addRow(rowValues)
  })

  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNum }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/** Header HTTP standar utk response file .xlsx (dipakai semua handler
 * export — pola sama persis `import.handler.ts` template faktur). */
export function excelResponseHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }
}
