// scripts/db-reset.ts
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL tidak ditemukan.");
  process.exit(1);
}
// TypeScript narrowing — process.exit() returns never, but TS doesn't always
// narrow after it; assert non-null here so downstream code reads correctly.
const dbUrl: string = databaseUrl;

/**
 * Deteksi apakah koneksi target adalah localhost.
 * Neon/cloud DB membutuhkan SSL, localhost tidak.
 */
function isLocalDb(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function resetDatabase() {
  // 1. Tampilkan Notice Peringatan Kritis
  console.log("\n ");
  console.log("PERINGATAN KRITIS: ANDA MENGAKSES DATABASE PRODUCTION!");
  console.log(" ");
  console.log("Tindakan ini akan MENGHAPUS SEMUA DATA SECARA PERMANEN.");
  console.log("Struktur tabel akan di-drop, dimigrasi, dan di-seed ulang.\n");

  // 2. Mekanisme Interaktivitas Prompt Bawaan Bun
  const konfirmasi = prompt("Ketik 'Y' untuk melanjutkan: ");

  // IF input tidak cocok -> THEN batalkan proses (Exit Code 0)
  if (konfirmasi !== "Y") {
    console.log("\n Operasi dibatalkan. Tidak ada perubahan pada database.");
    process.exit(0);
  }

  // IF input cocok -> THEN eksekusi query destruktif
  try {
    console.log("\n Menghapus skema 'public' pada database Production...");
    
    const sql = postgres(dbUrl, {
      ssl: isLocalDb(dbUrl) ? false : "require",
      onnotice: () => {},
    });

    await sql`DROP SCHEMA IF EXISTS public CASCADE;`;
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`;
    
    await sql`CREATE SCHEMA public;`;
    await sql`GRANT ALL ON SCHEMA public TO public;`;

    await sql.end();
    
    console.log(" Database Production berhasil dikosongkan.");
  } catch (error) {
    console.error(" Gagal mengosongkan database:", error);
    process.exit(1);
  }
}

resetDatabase();
