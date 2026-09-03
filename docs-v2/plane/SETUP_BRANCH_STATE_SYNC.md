# Setup: deploy dev/prod otomatis ubah state Plane

> **Status: sudah diimplementasikan** (2026-09-01) — script ada di
> `scripts/plane_branch_state_sync.py`, 2 job (`sync-plane-dev`/
> `sync-plane-prod`) sudah ditempel di `.github/workflows/pipeline.yml`.
> Dokumen ini sekarang berfungsi sebagai catatan desain/rationale, BUKAN
> langkah yang masih harus dikerjakan — kecuali langkah 3-4 (generate API
> key baru + simpan sebagai GitHub Secret `PLANE_API_KEY`) yang butuh aksi
> manual di Plane/GitHub dan belum tentu sudah dilakukan.

Ini otomasi tambahan di luar fitur bawaan Plane (Pull Request State Mapping
tidak bisa membedakan branch tujuan, dan juga premium-only). Ditempel
langsung sebagai 2 job baru di file `pipeline.yml` kamu yang sudah ada — BUKAN
workflow terpisah — supaya Plane baru diupdate **setelah deploy beneran
sukses** (pakai `needs: [deploy-dev]` / `needs: [deploy-prod]`), bukan cuma
saat PR di-merge.

## Yang terjadi

- Push ke `dev` (lewat merge PR) → job `deploy-dev` sukses deploy ke dev
  server → job baru `sync-plane-dev` jalan → Plane state work item terkait
  otomatis jadi **"In Review"**
- Push ke `main` (lewat merge PR) → job `deploy-prod` sukses deploy ke
  production → job baru `sync-plane-prod` jalan → Plane state work item
  terkait otomatis jadi **"Done"**
- Kalau `deploy-dev`/`deploy-prod` GAGAL (misal SSH ke VPS error), job sync
  Plane otomatis ikut di-skip (`needs.deploy-dev.result == 'success'`) —
  state Plane TIDAK berubah kalau deploy-nya sendiri gagal.

## ⚠️ Prasyarat penting: kode issue di commit/PR

Karena 585 commit lama diimpor **tanpa** kode issue (murni 1 commit = 1 work
item berdasarkan hash), otomasi ini **hanya berlaku untuk commit/PR baru ke
depannya** yang menyertakan kode issue Plane, formatnya:

```
EDASHBOARD-123
```

Contoh commit message:
```
git commit -m "EDASHBOARD-123: fix header spacing on mobile"
```

Contoh judul PR:
```
[EDASHBOARD-123] Fix header spacing on mobile
```

Tanpa kode ini di judul PR **atau** salah satu commit message di dalam PR
itu, script tidak tahu work item mana yang harus di-update — akan skip
dengan warning di log, bukan error.

(Kode `EDASHBOARD-123` ini kamu dapat dari nomor work item yang muncul di
Plane, misal saat kamu bikin task manual atau saat commit lama sudah
otomatis kebuat oleh integrasi GitHub → Plane.)

## ⚠️ Prasyarat penting #2: strategi merge PR `dev` → `main`

Kalau PR dari `dev` ke `main` di-merge pakai **"Squash and merge"**, SEMUA
commit yang menumpuk di `dev` (bisa dari beberapa task/PR berbeda, kalau
`main` sudah beberapa waktu tidak diupdate) diringkas jadi **1 commit baru**
di `main`. Kode issue dari task-task yang ikut ke-squash TIDAK OTOMATIS ikut
masuk ke pesan commit hasil squash itu, KECUALI setting default squash
message repo GitHub kamu di-set ke **"Pull request title and commit
details"** (Settings → General → Pull Requests → "Default commit message").
Kalau setting-nya masih default ("Pull request title" saja), cuma kode
issue yang kebetulan ada di JUDUL PR dev→main itu sendiri yang akan
ke-update ke "Done" — task lain yang ikut ter-squash **diam-diam TIDAK
ke-update** (script cuma print warning di log Actions, tidak ada error yang
mencolok).

Dua pilihan aman:
1. Pakai **"Create a merge commit"** (bukan squash) khusus untuk PR
   `dev` → `main` — semua commit asli (dan kode issue-nya) ikut terbawa apa
   adanya ke event push `main`.
2. Kalau tetap mau squash, ubah setting default squash message repo ke
   "Pull request title and commit details" dulu.

## Langkah setup

### 1. ✅ Script ditaruh di repo

```
e-dashboard/
  scripts/
    plane_branch_state_sync.py
  .github/
    workflows/
      pipeline.yml   <- sudah ditambah 2 job baru (lihat langkah 2)
```

### 2. ✅ 2 job baru sudah ditempel ke `pipeline.yml`

Job `sync-plane-dev` dan `sync-plane-prod` sudah ada di
`.github/workflows/pipeline.yml`, sejajar dengan job `backend`, `frontend`,
`deploy-prod`, `deploy-dev` yang sudah ada duluan.

Env yang sudah diisi di kedua job:
- `PLANE_WORKSPACE = "semanggi_holding"`
- `PLANE_PROJECT_ID = "f18c2855-78f8-4e53-9820-9a21ca186d0e"` (project E-Dashboard terakhir)
- `PLANE_PROJECT_IDENTIFIER = "EDASHBOARD"`

Kalau identifier project kamu beda, sesuaikan value `PLANE_PROJECT_IDENTIFIER`
di kedua job. Nama state target juga bisa disesuaikan lewat env var
`STATE_NAME_DEV` / `STATE_NAME_MAIN` kalau nama state kamu bukan persis
"In Review" / "Done".

### 3. Generate API key BARU (yang lama sudah pernah ke-paste di chat)

Settings → Developers → Access Tokens di Plane → revoke token lama
(`plane_api_4e79...`), generate token baru.

### 4. Simpan sebagai GitHub Secret

Di repo GitHub → **Settings → Secrets and variables → Actions → New
repository secret**:

- Name: `PLANE_API_KEY`
- Value: token baru dari langkah 3

(`GITHUB_TOKEN` di workflow sudah otomatis disediakan GitHub Actions,
tidak perlu dibuat manual.)

### 5. Commit & push

```bash
git add scripts/plane_branch_state_sync.py .github/workflows/pipeline.yml
git commit -m "ci: auto-sync Plane state setelah deploy dev/prod sukses"
git push
```

### 6. Test

1. Buat 1 work item di Plane (manual), catat kode issue-nya, misal `EDASHBOARD-999`.
2. Buat branch baru dari `dev`, commit dengan pesan
   `EDASHBOARD-999: test auto state sync`.
3. Buka PR ke `dev`, merge (ini akan trigger push ke `dev` → job
   `backend`/`frontend` → `deploy-dev` → `sync-plane-dev`).
4. Cek tab **Actions** di GitHub repo → job `deploy-dev` harus hijau, lalu
   job `sync-plane-dev` juga harus hijau setelahnya.
5. Cek Plane → work item `EDASHBOARD-999` → state harus berubah jadi **In Review**.
6. Ulangi dengan PR dari `dev` ke `main` → setelah `deploy-prod` sukses →
   state harus jadi **Done**.

## Catatan

- Job sync Plane baru jalan kalau job deploy terkait **sukses**
  (`needs.deploy-dev.result == 'success'` / `needs.deploy-prod.result ==
  'success'`). Kalau deploy gagal (SSH error, health check gagal, dll),
  state Plane tidak ikut berubah — sama seperti perilaku `needs` yang sudah
  kamu terapkan untuk CI→CD.
- Kode issue dicari dari **commit message** yang ada di event `push` itu
  (`github.event.commits.*.message`). Untuk merge PR pakai **"Create a merge
  commit"** atau **"Rebase and merge"**, semua commit asli dari PR tsb ikut
  masuk daftar ini apa adanya — aman.
- Kalau 1 push menyentuh banyak kode issue (beberapa commit, beberapa kode
  issue berbeda), semuanya akan di-update sekaligus.
- Script lookup work item LANGSUNG lewat kode issue-nya (endpoint
  `GET .../work-items/{IDENTIFIER}-{n}/`, 1 API call per kode) — tidak lagi
  mem-paginate seluruh work item project, jadi tidak ada batas atas jumlah
  work item yang bisa ditangani.
