Istilah-istilah ini muncul di kartu dan tabel rincian (drilldown) hampir semua KPI, dijelaskan sekali di sini dan dirujuk di tiap KPI di bawah.

## 6 Status Dasar

Setiap pelanggan yang sudah pernah bertransaksi berada di tepat satu status ini pada satu periode (kecuali Relapsed, yang merupakan penanda tambahan pada subset Dormant).

- **Acquisition**: Pelanggan yang baru pertama kali bertransaksi di periode berjalan.
- **Active Customer**: Pelanggan yang bertransaksi di periode sebelumnya, dan bertransaksi lagi di periode berjalan.
- **Reactivated**: Pelanggan yang tidak bertransaksi di periode sebelumnya, tapi kembali bertransaksi di periode berjalan (dan bukan pelanggan baru/Acquisition).
- **Lapsed**: Pelanggan yang pernah bertransaksi, tidak bertransaksi di periode ini, tapi belum melewati ambang waktu dormant untuk kategori bisnisnya.
- **Dormant**: Pelanggan yang pernah bertransaksi, dan sudah melewati ambang waktu dormant. Dianggap berhenti atau berisiko hilang.
- **Relapsed**: Pelanggan yang sempat aktif kembali setelah dormant (Reactivated), tapi dormant lagi di periode ini. Penanda tambahan, bukan status ke-6 yang berdiri sendiri.

## 4 Angka Gabungan

Angka-angka ini dipakai sebagai populasi penyebut di kartu ringkasan berbagai KPI, masing-masing disusun dari kombinasi status di atas.

- **Active Transacting** (`Acquisition + Active Customer + Reactivated`): Semua pelanggan yang bertransaksi di periode berjalan, termasuk yang baru pertama kali.
- **Existing Active** (`Active Customer + Reactivated`): Pelanggan yang sudah pernah bertransaksi sebelumnya (bukan pelanggan baru) dan masih aktif bertransaksi di periode berjalan.
- **Customer Base (Addressable)** (`Active Customer + Reactivated + Lapsed`): Pelanggan yang sudah pernah bertransaksi dan belum melewati ambang dormant, masih bisa dijangkau atau ditindaklanjuti.
- **Total Customer Base** (`Active Customer + Reactivated + Lapsed + Dormant`): Seluruh pelanggan yang pernah bertransaksi, apa pun status terkininya, termasuk yang sudah dormant.

## Populasi yang Dipakai Tiap KPI

| KPI | Populasi Penyebut |
| --- | --- |
| M1, M2 | Active Transacting |
| M3, M4, M5, M6 | Existing Active |
| M7 | Customer Base (Addressable) |
| M8, M9, M10 | Total Customer Base |
