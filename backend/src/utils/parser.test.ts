/**
 * utils/parser.test.ts
 *
 * Cakupan: parseExcel() dengan kolom opsional Sales Order/Delivery Order/ID Pelanggan
 * (laporan user 2026-07-24 — template kadang punya kolom SO/DO yang sebelumnya bikin
 * SELURUH import gagal karena validateExcelHeaders() menolak kolom tidak dikenal, dan
 * customer_code Excel selalu auto-generate dari invoice_number, tidak pernah baca ID
 * pelanggan asli dari file walau kolomnya ada).
 */
import { describe, test, expect } from 'bun:test'
import * as XLSX from 'xlsx'
import { parseExcel } from './parser'

const BASE_HEADERS = [
  'Tanggal', 'Sales Invoice', 'Pelanggan', 'Nama Kategori Barang Barang & Jasa',
  'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga', 'Laba',
]

const BASE_ROW = [
  '02 Jun 2026', 'SI.2026.06.02.001', 'CUSTOMER TEST', 'UNIT',
  'PRODUK A', '1', '100,000.', '100,000.', '20,000.',
]

function buildExcelBuffer(headers: string[], rows: string[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parseExcel — kolom opsional Sales Order / Delivery Order / ID Pelanggan', () => {
  test('template baseline (tanpa kolom opsional) tetap jalan seperti sebelumnya', async () => {
    const buffer = buildExcelBuffer(BASE_HEADERS, [BASE_ROW])
    const result = await parseExcel(buffer)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]!.customer_code).toBe('CUST-SI_2026_06_02_001')
  })

  test('kolom Sales Order + Delivery Order tidak lagi bikin import gagal (dulu throw "Kolom tidak dikenali")', async () => {
    const headers = [...BASE_HEADERS, 'Sales Order', 'Delivery Order']
    const row = [...BASE_ROW, 'SO-001', 'DO-001']
    const buffer = buildExcelBuffer(headers, [row])
    const result = await parseExcel(buffer)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    // datanya diabaikan - tidak ada field sales_order/delivery_order di InvoiceRow
    expect(result.rows[0]).not.toHaveProperty('sales_order')
    expect(result.rows[0]).not.toHaveProperty('delivery_order')
  })

  test('kolom "ID Pelanggan Pelanggan Faktur Penjualan" dipakai sbg customer_code asli, bukan auto-generate', async () => {
    const headers = [...BASE_HEADERS, 'ID Pelanggan Pelanggan Faktur Penjualan']
    const row = [...BASE_ROW, 'CUST-ASLI-001']
    const buffer = buildExcelBuffer(headers, [row])
    const result = await parseExcel(buffer)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]!.customer_code).toBe('CUST-ASLI-001')
  })

  test('kolom ID Pelanggan ada tapi selnya kosong di baris tertentu → fallback auto-generate', async () => {
    const headers = [...BASE_HEADERS, 'ID Pelanggan Pelanggan Faktur Penjualan']
    const row = [...BASE_ROW, '']
    const buffer = buildExcelBuffer(headers, [row])
    const result = await parseExcel(buffer)
    expect(result.errors).toEqual([])
    expect(result.rows[0]!.customer_code).toBe('CUST-SI_2026_06_02_001')
  })

  test('kolom benar-benar tidak dikenal (bukan SO/DO/ID Pelanggan) tetap ditolak', async () => {
    const headers = [...BASE_HEADERS, 'Kolom Aneh Tidak Dikenal']
    const row = [...BASE_ROW, 'xxx']
    const buffer = buildExcelBuffer(headers, [row])
    await expect(parseExcel(buffer)).rejects.toThrow(/Kolom tidak dikenali/)
  })
})
