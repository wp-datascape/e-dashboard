/**
 * scripts/test-accurate.ts
 *
 * Test koneksi Accurate Online API dengan API Token.
 *
 * Flow:
 *   1. POST /api/api-token.do — validasi token + dapatkan host sebenarnya
 *      (Headers: Authorization, X-Api-Timestamp, X-Api-Signature)
 *   2. GET {host}/accurate/api/customer/list.do — sample 5 customer
 *   3. GET {host}/accurate/api/sales-invoice/list.do — sample 5 invoice
 *
 * X-Api-Signature = HMAC-SHA256(X-Api-Timestamp, Signature Secret) → Base64
 *
 * Usage:
 *   ACCURATE_SIGNATURE_SECRET='xxx' ACCURATE_API_TOKEN='aat.NTA...' bun run backend/scripts/test-accurate.ts
 */

const NUCLEUS_BASE = 'https://account.accurate.id'

async function hmacSha256Base64(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(signature)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function getTimestampNow(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const nn = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${nn}:${ss}`
}

async function main() {
  // ─── Input ─────────────────────────────────────────────────────────────────
  let signatureSecret = (process.env.ACCURATE_SIGNATURE_SECRET || '').trim()
  let apiToken = (process.env.ACCURATE_API_TOKEN || '').trim()

  if (!signatureSecret || !apiToken) {
    console.log('\n🔑 Accurate Online API Test')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    const readline = await import('node:readline/promises')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    signatureSecret = (await rl.question('Signature Secret: ')).trim()
    apiToken = (await rl.question('API Token (aat...): ')).trim()
    rl.close()
    if (!signatureSecret || !apiToken) {
      console.error('❌ Keduanya wajib diisi')
      process.exit(1)
    }
  }

  const maskedToken = apiToken.length > 16
    ? apiToken.substring(0, 12) + '...' + apiToken.substring(apiToken.length - 4)
    : apiToken.substring(0, 8) + '...'

  console.log(`\n🔑 Token: ${maskedToken}`)
  console.log(`🔐 Signature Secret: ${signatureSecret.substring(0, 4)}...${signatureSecret.substring(signatureSecret.length - 4)}`)

  // ─── Step 1: POST /api/api-token.do ──────────────────────────────────────
  console.log('\n1️⃣  Step 1: Validate Token & Get Host')
  console.log(`   POST ${NUCLEUS_BASE}/api/api-token.do`)

  const timestamp1 = getTimestampNow()
  const sig1 = await hmacSha256Base64(timestamp1, signatureSecret)

  console.log(`   X-Api-Timestamp : ${timestamp1}`)
  console.log(`   X-Api-Signature : ${sig1}`)

  try {
    const tokenResp = await fetch(`${NUCLEUS_BASE}/api/api-token.do`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'X-Api-Timestamp': timestamp1,
        'X-Api-Signature': sig1,
        'Content-Type': 'application/json',
      },
    })

    const tokenRawText = await tokenResp.text()
    console.log(`   Response Status: ${tokenResp.status}`)

    if (!tokenResp.ok) {
      console.error(`   ❌ GAGAL!`)
      console.error(`   Response: ${tokenRawText.substring(0, 500)}`)
      process.exit(1)
    }

    // Debug: print response structure
    console.log('\n   📦 RAW RESPONSE (parsial):')
    console.log(`   ${tokenRawText.substring(0, 800)}`)
    console.log('   ...\n')

    const tokenJson = JSON.parse(tokenRawText)

    if (!tokenJson.s) {
      console.error(`   ❌ API returned s:false`)
      console.error(`   ${JSON.stringify(tokenJson.d)}`)
      process.exit(1)
    }

    const d = tokenJson.d
    // Response: d.database.host, d.database.alias, d.database.id
    const database = d.database || {}
    const host = database.host
    const alias = database.alias || '-'
    const userName = d.user?.fullName || d.user?.email || '-'
    const dbId = database.id || '-'

    console.log(`   ✅ BERHASIL!`)
    console.log(`   User     : ${userName}`)
    console.log(`   Database : ${alias}`)
    console.log(`   DB ID    : ${dbId}`)
    console.log(`   Host     : ${host || '(tidak ada — token ini developer token, bukan client token)'}`)
    console.log()

    if (!host) {
      console.log('ℹ️  Token yang dipakai adalah developer token (dari halaman Dashboard)')
      console.log('   Untuk akses data client, gunakan API Token yang di-generate dari')
      console.log('   halaman "API Token" untuk database tertentu.')
      console.log()
      process.exit(0)
    }

    // ─── Step 2: Customer List (sample 5) ──────────────────────────────────
    const timestamp2 = getTimestampNow()
    const sig2 = await hmacSha256Base64(timestamp2, signatureSecret)

    console.log('2️⃣  Step 2: Customer List (sample 5)')
    console.log(`   GET ${host}/accurate/api/customer/list.do`)

    const custResp = await fetch(
      `${host}/accurate/api/customer/list.do?sp.page=1&sp.pageSize=5&fields=id,name,customerNo`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'X-Api-Timestamp': timestamp2,
          'X-Api-Signature': sig2,
        },
      },
    )

    const custText = await custResp.text()
    console.log(`   Status: ${custResp.status}`)

    if (custResp.ok) {
      const custJson = JSON.parse(custText)
      const customers = custJson.d?.data || (Array.isArray(custJson.d) ? custJson.d : [])
      console.log(`   ✅ ${customers.length} customer ditemukan`)
      customers.slice(0, 3).forEach((c: any, i: number) => {
        console.log(`     ${i + 1}. [${c.customerNo || '-'}] ${c.name || '-'}`)
      })
    } else {
      console.log(`   ⚠️  ${custText.substring(0, 300)}`)
    }
    console.log()

    // ─── Step 3: Sales Invoice List (sample 5) ─────────────────────────────
    const timestamp3 = getTimestampNow()
    const sig3 = await hmacSha256Base64(timestamp3, signatureSecret)

    console.log('3️⃣  Step 3: Sales Invoice List (sample 5)')
    console.log(`   GET ${host}/accurate/api/sales-invoice/list.do`)

    const invResp = await fetch(
      `${host}/accurate/api/sales-invoice/list.do?sp.page=1&sp.pageSize=5&fields=id,number,transDate,customerName,totalAmount`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'X-Api-Timestamp': timestamp3,
          'X-Api-Signature': sig3,
        },
      },
    )

    const invText = await invResp.text()
    console.log(`   Status: ${invResp.status}`)

    if (invResp.ok) {
      const invJson = JSON.parse(invText)
      const invoices = invJson.d?.data || (Array.isArray(invJson.d) ? invJson.d : [])
      console.log(`   ✅ ${invoices.length} invoice ditemukan`)
      invoices.slice(0, 3).forEach((inv: any, i: number) => {
        const amount = inv.totalAmount || inv.grandTotal || 0
        console.log(`     ${i + 1}. ${inv.number || '-'} | ${inv.transDate || '-'} | ${inv.customerName || '-'} | Rp ${Number(amount).toLocaleString()}`)
      })
    } else {
      console.log(`   ⚠️  ${invText.substring(0, 300)}`)
    }
    console.log()

  } catch (err) {
    console.error(`   ❌ ERROR: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ TEST SELESAI')
  console.log()
}

main().catch((err) => {
  console.error('\n❌ FATAL:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})