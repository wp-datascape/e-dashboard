# executive-dashboard/decisions.md

## 2026-06-17 — Executive Dashboard sebagai Group 1 (Makro/Primary)
Keputusan: Dashboard ini jadi satu-satunya halaman Makro, mewakili kebutuhan bisnis utama (strategic overview). Customer/Product/Transaction Workbench berperan sebagai Mikro drill-down, bukan halaman setara.

Alasan: User berpikir dalam istilah "siapa yang beli, apa yang laku, kapan terjadi" -- bukan "tampilkan M3". Dashboard summary tetap jadi entry point utama untuk executive/manager.

Dampak: Routing /dashboard tetap sebagai landing page utama. Semua metrik di halaman lain harus link balik ke sini sebagai ringkasan.

## 2026-06-17 — Filter business_unit ditunda dari frontend yang sudah jalan
Keputusan: Toggle filter business_unit BELUM ditambahkan ke /dashboard meskipun sudah ~75% jadi, karena field customers.business_unit belum ada di schema (lihat shared/data-model.md Pending Schema Items).

Alasan: Backend masih 0%, schema belum dimigrasikan -- lebih murah tambah field sebelum migration pertama daripada bikin migration tambahan nanti.

Dampak: Phase 1 (lihat overview.md Next Action) wajib selesaikan field ini dulu sebelum filter BU dipasang di UI.

## Status: tidak ada keputusan terbuka lain untuk Group 1
Semua 9 chart widget reusable sudah final dan tidak berubah desain untuk Group 1.
