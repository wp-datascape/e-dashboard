/**
 * SSOT segmentasi customer.
 *
 * Definisi FINAL SEKARANG: task029 §30.10 (2026-08-20), relatif-PERIODE
 * (anchor kalender), BUKAN lagi task028 (2026-08-18, activeMonths mundur
 * dari filterDate tanpa anchor kalender) — task028 SUPERSEDE task027 §4,
 * lalu §30.10 SUPERSEDE task028 dua hari kemudian. Instruksi user 2026-08-23:
 * "task terbaru ini revisi dari task-task sebelumnya, patokanmu ke definisi
 * terbaru" — riwayat 3 lapis (task026/027 → task028 → §30.10) didokumentasikan
 * di sini SUPAYA JELAS mana yang berlaku, bukan diikuti berurutan.
 *
 *   New      = transaksi pertama (SEPANJANG HIDUP) jatuh DI DALAM periode
 *              kalender yang sedang dilihat (lihat `cteFirstInvoiceDate`).
 *   Existing = first_invoice SEBELUM AWAL periode kalender itu (lihat
 *              `cteExistingCustomersByPeriod`/`cteEstablishedCustomers` di
 *              bawah) — TERMASUK yang sudah dormant (bagian task028 yang
 *              MASIH berlaku, cuma anchor waktunya yang diganti §30.10).
 *   Active   = sub-status DI DALAM Existing: punya transaksi di periode yang
 *              sedang dilihat.
 *   Dormant  = sub-status DI DALAM Existing: tidak ada invoice dalam
 *              dormant_threshold_months sesuai kategori bisnis customer
 *              (tetap per-kategori, lihat task027 §1-3 — bug itu terpisah,
 *              tidak disentuh perubahan ini).
 *
 * New "graduasi" otomatis jadi Existing begitu awal periode berikutnya
 * lewat first_invoice_date-nya (mis. New Agustus → Existing September) —
 * tidak perlu logic tambahan, tiap titik waktu dievaluasi independen dari
 * posisi first_invoice_date vs batas periode yang dipilih.
 *
 * `cteEstablishedCustomers` di bawah tetap nama lama (hindari rename massal
 * di 6 file pemanggil M3-M10), tapi body-nya SEKARANG = §30.10 (anchor
 * periode kalender via parameter `periodStart` wajib), BUKAN activeMonths
 * mentah task028 lagi.
 */

import { sql, and, or, type SQL } from 'drizzle-orm'
import { divisionToDormantKey, buildDormantCaseSql, type ThresholdConfig } from '@/features/config/threshold'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw, buildOnlyParetoRaw } from '@/utils/scope'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentParams {
  cid: number            // 0 = semua perusahaan (perhatian: bukan berarti bypass, lihat companyScopeIds)
  companyScopeIds?: number[] // hasil resolveCompanyScope() — undefined=bypass, []=default deny, selainnya=IN-list
  filterDate: string     // YYYY-MM-DD
  activeMonths: number   // active_window_months dari business_config
  dormantMonths: number  // dormant_threshold_months.{type} dari business_config — scalar 1-divisi-dominan
                          // (task027 BUG, dipertahankan demi backward-compat caller lama; caller BARU
                          // pakai `dormant`+`dormantCategoryMap` di bawah utk threshold PER-CUSTOMER)
  dormant: ThresholdConfig['dormant']  // semua kategori dormant sekaligus (b2b_dc/b2b_project/b2c/manufacturing)
  dormantCategoryMap: Map<number, keyof ThresholdConfig['dormant']> // division_id → kategori dormant
  division: number | null // filter laporan (business_unit param, division_id — task012 v2) - beda dari divisionScope (RBAC)
  branchFilter: number | null // filter laporan (branch_id param) - beda dari branchScope (RBAC)
  excludeIntercompany?: boolean // toggle laporan - exclude division 'intercompany', lihat utils/scope.ts
  onlyPareto?: boolean // toggle laporan (task029.md §35) - persempit ke customer flagged Pareto (tabel pareto_customers, task016), lihat utils/scope.ts buildOnlyParetoRaw
  branchScope?: Map<number, number[]>   // RBAC — lihat docs-v2/task/task001.md §4
  divisionScope?: Map<number, number[]> // RBAC — lihat docs-v2/task/task001.md §4
  // Fallback division_id 'other'/'intercompany' per branch/company (task012 v2, resolusi
  // sekali per request — lihat utils/scope.ts loadDivisionFallbackIds/flattenFallbackByBranch)
  otherIdByBranch: Map<number, number>
  intercompanyIdByCompany: Map<number, number>
}

export function buildSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  activeMonths: number,
  dormantMonths: number,
  otherIdByBranch: Map<number, number>,
  intercompanyIdByCompany: Map<number, number>,
  dormant: ThresholdConfig['dormant'],
  dormantCategoryMap: Map<number, keyof ThresholdConfig['dormant']>,
  division?: number,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  companyScopeIds?: number[],
  branchFilter?: number,
  excludeIntercompany?: boolean,
  onlyPareto?: boolean,
): SegmentParams {
  return {
    cid: companyId === 'all' ? 0 : companyId,
    companyScopeIds,
    filterDate,
    activeMonths,
    dormantMonths,
    dormant,
    dormantCategoryMap,
    division: division ?? null,
    branchFilter: branchFilter ?? null,
    excludeIntercompany,
    onlyPareto,
    branchScope,
    divisionScope,
    otherIdByBranch,
    intercompanyIdByCompany,
  }
}

// ─── SQL expression (CASE WHEN) — SSOT per baris ─────────────────────────────

/**
 * CASE WHEN expression untuk kolom status per customer.
 * Dipakai di SELECT agar setiap baris punya label status-nya.
 *
 * `dormantMonths` boleh scalar (1 angka, dipakai kalau caller sudah tahu
 * SATU customer/SATU divisi spesifik — mis. findCustomerDetail) ATAU
 * ekspresi SQL per-baris dari `buildDormantCaseSql()` (dipakai kalau caller
 * query banyak customer lintas divisi sekaligus — mis. findCustomers,
 * task027 fix 2026-08-21). Widget interpolasi `sql` tag menangani keduanya
 * sama — angka jadi bound param, SQL fragment di-splice apa adanya.
 */
export function sqlStatusExpr(
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormantMonths: number | SQL,
  lastInv: unknown,
  firstInv: unknown,
) {
  const activeCutoff  = sql`${refDate} - ${activeMonths}::int  * INTERVAL '1 month'`
  // isDormant (2026-08-27, task029.md §36.52 — koreksi KERAS user: "pelanggan
  // baru pindah status dorman saat bulan agustus sudah habis... ada
  // kesalahan logika disini") — reuse dormantCrossedSql (kalender-bulan
  // penuh), BUKAN lagi `lastInv <= refDate - dormantMonths bulan` mentah
  // (tanggal presisi, bikin status dormant "meletus" di tengah bulan).
  const isDormant = dormantCrossedSql(sql`${lastInv}::date`, sql`${refDate}::date`, sql`${dormantMonths}::int`)

  return sql<string>`
    CASE
      WHEN ${lastInv} IS NULL                     THEN 'new'
      WHEN ${firstInv}::date >= ${activeCutoff}   THEN 'new'
      WHEN ${isDormant}                           THEN 'dormant'
      WHEN ${lastInv}::date  >= ${activeCutoff}   THEN 'active'
      ELSE 'existing'
    END
  `
}

/**
 * WHERE condition untuk filter status di halaman Customer.
 * 'active' = new + active chip = semua yang last_invoice >= activeCutoff.
 * 'existing' = non-new, non-dormant (antara active_window dan dormant_threshold).
 */
export function sqlStatusWhere(
  status: string,
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormantMonths: number | SQL,
  lastInv: unknown,
  firstInv: unknown,
) {
  const activeCutoff  = sql`${refDate} - ${activeMonths}::int  * INTERVAL '1 month'`
  // isDormant/notDormant (2026-08-27, task029.md §36.52) — pola SAMA PERSIS
  // sqlStatusExpr di atas, reuse dormantCrossedSql kalender-bulan penuh.
  const isDormant  = dormantCrossedSql(sql`${lastInv}::date`, sql`${refDate}::date`, sql`${dormantMonths}::int`)
  const notDormant = dormantCrossedSql(sql`${lastInv}::date`, sql`${refDate}::date`, sql`${dormantMonths}::int`, true)

  const isNew  = or(sql`${lastInv} IS NULL`, sql`${firstInv}::date >= ${activeCutoff}`)
  const notNew = and(
    sql`${lastInv} IS NOT NULL`,
    sql`(${firstInv} IS NULL OR ${firstInv}::date < ${activeCutoff})`,
  )

  switch (status) {
    case 'new':     return isNew
    case 'dormant': return and(notNew, isDormant)
    // BUG (ditemukan 2026-08-10 lewat audit silang DormantRate vs Customer
    // Workbench — user: "aktif customer bulan Juni 357? di menu lain 329,
    // mana yang benar?"): case ini SATU-SATUNYA yang tidak exclude customer
    // baru (notNew), beda dari 'dormant'/'existing' di sekelilingnya —
    // akibatnya customer yang baru transaksi pertama kali (harusnya masuk
    // 'new') ikut ke-double-count sbg 'active' juga saat difilter
    // `?status=active`. Kolom status per-baris (sqlStatusExpr di atas) TIDAK
    // kena bug ini (CASE-nya cek 'new' duluan), cuma filter dropdown ini.
    case 'active':  return and(notNew, sql`${lastInv}::date >= ${activeCutoff}`)
    case 'existing':
      return and(
        notNew,
        notDormant,
        sql`${lastInv}::date < ${activeCutoff}`,
      )
    default: return undefined
  }
}

// ─── CTE builders — dipakai dalam WITH clause query yang lebih besar ──────────

/**
 * CTE: established_customers
 * Universe KPI M3–M10 = Existing (task028: semua customer KECUALI New,
 * TERMASUK yang sudah dormant — bukan "active+existing exclude dormant"
 * lagi, lihat docstring SSOT di atas).
 * - division filter: (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
 *   → saat division=null, filter jadi TRUE (global); saat division diisi, filter spesifik.
 * Dipakai sebagai denominator dan base join di metrics query.
 */
// `periodStart` (task029 §30.10, 2026-08-23 — instruksi user: "task terbaru
// ini revisi dari task-task sebelumnya, patokanmu ke definisi terbaru") —
// definisi task028 di atas (activeMonths mundur dari filterDate, TANPA
// anchor kalender) SUDAH DIGANTIKAN oleh §30.10 (relatif-periode, anchor ke
// AWAL PERIODE kalender), yang sejauh ini cuma diterapkan di M1
// (`cteExistingCustomersByPeriod`). Fungsi ini SEKARANG diselaraskan ke
// definisi §30.10 yang sama persis (reuse `cteFirstInvoiceDate`), nama
// tetap `cteEstablishedCustomers`/`established_customers` (hindari rename
// massal di 6 file pemanggil M3-M10), TAPI body & parameternya sekarang
// identik prinsipnya dengan `cteExistingCustomersByPeriod` — cuma beda
// caller-nya butuh kolom `customer_name`/`customer_code` tambahan.
//
// `periodStart` WAJIB diisi eksplisit oleh caller (bukan dihitung ulang di
// sini dari activeMonths) — utk KPI yang SUDAH py konsep periode kalender
// (M3/M4/M7 drilldown, param `dateFrom` yang sudah ada), kirim awal bucket
// yang sedang dilihat. Utk KPI yang BELUM py filter granularitas periode
// sama sekali (M5/M6/M8-10 — masih snapshot "per filterDate", bukan
// [start,end]) — caller pakai awal BULAN kalender yang memuat filterDate
// (`date_trunc('month', filterDate)`), konsisten dgn perilaku "Bulanan"
// default granularitas KPI lain, TANPA perlu UI filter baru dulu.
export function cteEstablishedCustomers(p: SegmentParams, periodStart: string) {
  const companyCondC = buildCompanyConditionRaw('c.company_id', p.cid, p.companyScopeIds)
  return sql`
    ${cteFirstInvoiceDate(p)},
    established_customers AS (
      SELECT c.id, c.customer_name, c.customer_code
      FROM customers c
      JOIN first_invoice_date fid ON fid.customer_id = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND fid.first_date < ${periodStart}::date
    )
  `
}

// ─── New/Existing RELATIF PERIODE (task029 §30.10, 2026-08-20) ────────────────
//
// BEDA dari `cteEstablishedCustomers` di atas (activeMonths mundur, dipakai
// M3-M10, task026 §8e — TIDAK disentuh/diganti). Ini definisi TERPISAH,
// khusus laporan granularitas Monthly/Quarterly/Semester/Annual (task029
// §30) di mana "periode" itu sendiri (batas kalender) yang jadi acuan New/
// Existing, BUKAN window bulan tetap:
//   New      = transaksi pertama (SEPANJANG HIDUP customer) jatuh DI DALAM
//              periode yang sedang dilihat.
//   Existing = transaksi pertama SEBELUM AWAL periode ini — otomatis
//              "graduasi" begitu periode berganti (Juli→Agustus), tanpa
//              logic tambahan, cukup dari posisi tanggal transaksi pertama
//              vs batas periode yang dipilih.
// Pilot: M1 Cross Selling (m1.repository.ts). Metrics lain menyusul —
// lihat task029.md §30.9.

/**
 * CTE: first_invoice_date(customer_id, first_date) — tanggal transaksi
 * PERTAMA seorang customer SEPANJANG HIDUP, di-scope company+branch RBAC
 * SAJA (BUKAN division/branch filter laporan, BUKAN exclude_intercompany —
 * sama seperti `cteEstablishedCustomers` ix0 di atas: status New/Existing
 * customer itu properti GLOBAL customer, tidak boleh berubah cuma karena
 * laporan sedang difilter ke divisi/cabang tertentu).
 */
export function cteFirstInvoiceDate(p: SegmentParams) {
  const branchCond = buildBranchConditionRaw('ix0.company_id', 'ix0.branch_id', p.branchScope)
  const companyCondIx0 = buildCompanyConditionRaw('ix0.company_id', p.cid, p.companyScopeIds)
  return sql`
    first_invoice_date AS (
      SELECT ix0.customer_id, MIN(ix0.invoice_date) AS first_date
      FROM invoices ix0
      WHERE ix0.deleted_at IS NULL
        AND ${branchCond}
        AND ${companyCondIx0}
      GROUP BY ix0.customer_id
    )
  `
}

/**
 * CTE: existing_customers(id) — populasi "Existing" utk SATU periode
 * (`periodStart` = awal kalender periode itu, task029 §30.10). Caller
 * (mis. inv CTE di m1.repository.ts) yang menambah syarat "punya transaksi
 * DI DALAM periode" via JOIN ke invoices dengan range [periodStart,
 * periodEnd] sendiri — supaya tidak dobel logic dgn `first_invoice_date`.
 */
export function cteExistingCustomersByPeriod(p: SegmentParams, periodStart: string) {
  const companyCondC = buildCompanyConditionRaw('c.company_id', p.cid, p.companyScopeIds)
  return sql`
    ${cteFirstInvoiceDate(p)},
    existing_customers AS (
      SELECT c.id
      FROM customers c
      JOIN first_invoice_date fid ON fid.customer_id = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND fid.first_date < ${periodStart}::date
    )
  `
}

// ─── Dormant threshold PER-CUSTOMER (task027, 2026-08-21) ─────────────────────
//
// BUG: resolveDormantMonths() (config/threshold.ts) cari SATU divisi paling
// dominan company-wide lalu pakai ambang divisi ITU SAJA utk SEMUA customer
// (dormantMonths scalar di atas). Customer kategori bisnis lain (mis.
// b2b_project, ambang 12bln) ikut dicek pakai ambang divisi dominan (mis.
// b2b_dc, 3bln) — salah cap Dormant. Infrastruktur fix (getDormantCategoryMap/
// buildDormantCaseSql, config/threshold.ts) SUDAH ADA tapi belum pernah
// disambungkan (dead code) — 2 builder di bawah menyambungkannya.

/**
 * CTE: cust_division(cid, division_id) — divisi customer dari invoice
 * TERBARU, pattern SAMA PERSIS `latestSalespersonSq` (customers.repository.ts).
 * Di-scope company+branch RBAC SAJA (BUKAN filter laporan division/branchFilter/
 * exclude_intercompany) — filosofi SAMA `cteFirstInvoiceDate`: "kategori bisnis"
 * customer itu properti GLOBAL, tidak boleh berubah cuma karena laporan sedang
 * difilter ke divisi/cabang tertentu.
 */
export function cteCustDivision(p: SegmentParams) {
  const branchCond = buildBranchConditionRaw('ix2.company_id', 'ix2.branch_id', p.branchScope)
  const companyCondIx2 = buildCompanyConditionRaw('ix2.company_id', p.cid, p.companyScopeIds)
  return sql`
    cust_division AS (
      SELECT DISTINCT ON (ix2.customer_id)
        ix2.customer_id AS cid,
        cd2.division_id AS division_id
      FROM invoices ix2
      LEFT JOIN channel_divisions cd2
        ON cd2.channel_name = ix2.channel_name
        AND cd2.company_id = ix2.company_id
      WHERE ix2.deleted_at IS NULL
        AND ${companyCondIx2}
        AND ${branchCond}
      ORDER BY ix2.customer_id, ix2.invoice_date DESC, ix2.id DESC
    )
  `
}

/**
 * CASE WHEN division_id → ambang dormant (bulan), per-customer. Wrapper tipis
 * di atas buildDormantCaseSql() (config/threshold.ts) — nge-bundle
 * COALESCE(division_override_id, cust_division.division_id) (task013 pattern,
 * sama seperti excludeIntercompanyCond) supaya caller tidak perlu tulis ulang
 * COALESCE-nya. Wajib JOIN cteCustDivision() dulu dengan alias yang sama
 * dengan `divisionAlias` (default 'cdv') sebelum dipakai.
 */
export function dormantThresholdCaseSql(p: SegmentParams, customerAlias = 'c', divisionAlias = 'cdv'): SQL {
  return buildDormantCaseSql(
    sql`COALESCE(${sql.raw(customerAlias)}.division_override_id, ${sql.raw(divisionAlias)}.division_id)`,
    p.dormant,
    p.dormantCategoryMap,
  )
}

/**
 * Ambang dormant KALENDER-BULAN PENUH, BUKAN aritmatika hari mentah
 * (2026-08-27, task029.md §36.52 — koreksi KERAS user: "pelanggan baru
 * pindah status dorman saat bulan agustus sudah habis, mereka baru
 * berstatus dorman saat masuk bulan september... ada kesalahan logika
 * disini" — kasus konkret: transaksi terakhir 27 Februari, ambang 6
 * bulan, `refDate - 6 bulan` mentah = 27 Agustus PERSIS, jadi status
 * dormant "meletus" di tengah bulan Agustus. SEHARUSNYA (pola SAMA
 * PERSIS koreksi `months_dormant` sebelumnya, task029.md §-25: "CUTOFF
 * APRIL ITU AKHIR BULAN... SEHARUSNYA TERHITUNG MEI JUNI JULI TANPA
 * ORDERAN, MASUK DORMANT DI AGUSTUS" — last order April + ambang 3 bulan
 * → 3 bulan PENUH tanpa order (Mei/Juni/Juli) baru dormant MULAI
 * Agustus, BUKAN pada tanggal presisi "April + 3 bulan"): last order
 * Februari (tanggal berapa pun) + ambang 6 bulan → 6 bulan PENUH tanpa
 * order (Maret-Agustus) baru dormant MULAI September, BUKAN 27 Agustus.
 *
 * Formula: refDate >= DATE_TRUNC('month', lastDate) + (threshold+1) bulan
 * — anchor ke AWAL BULAN transaksi terakhir (bukan tanggal presisinya),
 * +1 supaya bulan transaksi terakhir SENDIRI tidak ikut terhitung "bulan
 * tanpa order" (customer yang order 27 Februari tetap "aktif" sepanjang
 * Februari, grace period baru mulai Maret).
 *
 * `lastDateSql`/`refDateSql`/`thresholdSql` — fragment SQL (kolom atau
 * ekspresi), BUKAN nilai JS — caller kirim apa pun yang sudah valid di
 * scope query (kolom CTE, parameter `${x}::date`, dll), fungsi ini murni
 * merangkai perbandingannya. `negate=true` mengembalikan kebalikannya
 * (`refDate < ...`, dipakai utk cek "BELUM dormant"/"masih dalam masa
 * tenggang") — dipisah sbg parameter (bukan caller nulis `NOT (...)`
 * sendiri) supaya index NULL-handling (`lastDate IS NULL`) konsisten di
 * satu tempat.
 */
export function dormantCrossedSql(lastDateSql: SQL, refDateSql: SQL, thresholdSql: SQL, negate = false): SQL {
  const cmp = negate ? sql`<` : sql`>=`
  return sql`(${refDateSql} ${cmp} DATE_TRUNC('month', ${lastDateSql}) + (${thresholdSql} + 1) * INTERVAL '1 month')`
}

// ─── Bundel kondisi scope invoice (refactor, 2026-08-21) ───────────────────────

/**
 * Bundel 4 kondisi scope isolasi data invoice sekaligus (branch RBAC, division
 * RBAC, company scope, exclude-intercompany filter) — REFACTOR MURNI (bukan
 * restrukturisasi, lihat task029.md §30.10-adjacent audit isolasi 2026-08-21):
 * memanggil 4 fungsi builder yang SAMA PERSIS dengan parameter yang SAMA PERSIS
 * seperti sebelumnya, cuma dibungkus 1 pemanggilan — TIDAK ada logic isolasi
 * baru, hasilnya provably identik dengan 4 baris terpisah yang digantikannya.
 *
 * Ditemukan lewat audit: pola "const branchCond = buildBranchConditionRaw(...);
 * const divisionScopeCond = ...; const companyCondI = ...; const
 * excludeIntercompanyCond = ..." ditulis ulang identik di 13+ file repository
 * metrics (beberapa sampai 3x dalam 1 file) — total ~30 blok duplikat.
 *
 * Alias tabel BOLEH beda per query (mis. join customers pakai alias `c` di
 * sebagian file, `c_ov` di sebagian lain) — makanya alias eksplisit sbg
 * parameter opsional, BUKAN di-hardcode, supaya tetap 100% setara dgn kode
 * yang digantikan di tiap file (bukan asumsi 1 alias untuk semua).
 */
export interface InvoiceScopeConditions {
  branchCond: SQL
  divisionScopeCond: SQL
  companyCondI: SQL
  excludeIntercompanyCond: SQL
  onlyParetoCond: SQL
}

// Tipe STRUKTURAL (subset field), bukan `SegmentParams` penuh — beberapa file
// repository metrics pakai interface param sendiri (`AvgCategoryRepoParams`,
// `HmDetailRepoParams`, dst, field sama tapi tipe beda nominal) alih-alih
// `SegmentParams`. `SegmentParams` otomatis cocok ke tipe ini (structural
// typing), begitu juga tipe ad-hoc lain selama field-nya ada.
export interface InvoiceScopeParams {
  cid: number
  companyScopeIds?: number[]
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
  excludeIntercompany?: boolean
  // filterDate/onlyPareto (task029.md §35, 2026-08-25) — OPSIONAL (beda dari
  // field lain di interface ini) SENGAJA supaya caller ad-hoc lama
  // (AvgCategoryRepoParams/HmDetailRepoParams dst, fitur Product/Customer
  // Workbench yang TIDAK punya UI filter Pareto) tetap compile tanpa
  // perubahan — mereka cukup tidak destructure `onlyParetoCond` dari hasil
  // fungsi ini, aman/backward-compatible. onlyParetoCond akan selalu `true`
  // (no-op) kalau onlyPareto falsy, jadi aman dipanggil dgn filterDate
  // kosong SELAMA onlyPareto juga tidak pernah true utk caller itu.
  filterDate?: string
  onlyPareto?: boolean
}

export function resolveInvoiceScopeConditions(
  p: InvoiceScopeParams,
  aliases: { invoice?: string; customer?: string; division?: string } = {},
): InvoiceScopeConditions {
  const i = aliases.invoice ?? 'i'
  const c = aliases.customer ?? 'c'
  const cd = aliases.division ?? 'cd'
  return {
    branchCond: buildBranchConditionRaw(`${i}.company_id`, `${i}.branch_id`, p.branchScope),
    divisionScopeCond: buildDivisionConditionRaw(`${i}.branch_id`, `${cd}.division_id`, p.divisionScope, p.otherIdByBranch),
    companyCondI: buildCompanyConditionRaw(`${i}.company_id`, p.cid, p.companyScopeIds),
    excludeIntercompanyCond: buildExcludeIntercompanyRaw(`${i}.company_id`, `COALESCE(${c}.division_override_id, ${cd}.division_id)`, p.intercompanyIdByCompany, p.excludeIntercompany),
    onlyParetoCond: buildOnlyParetoRaw(`${c}.id`, `${i}.company_id`, p.filterDate ?? '', p.onlyPareto),
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function monthEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export { divisionToDormantKey }
