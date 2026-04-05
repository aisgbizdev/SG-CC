# User Manual — SG Control Center (SGCC)

**Versi:** 1.0
**Tanggal:** April 2026

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Akses & Login](#2-akses--login)
3. [Navigasi Aplikasi](#3-navigasi-aplikasi)
4. [Penjelasan Role Pengguna](#4-penjelasan-role-pengguna)
5. [Dashboard](#5-dashboard)
6. [Aktivitas](#6-aktivitas)
7. [Kasus Pengaduan](#7-kasus-pengaduan)
8. [Tugas](#8-tugas)
9. [Pengumuman](#9-pengumuman)
10. [Pesan](#10-pesan)
11. [Notifikasi](#11-notifikasi)
12. [Penilaian KPI](#12-penilaian-kpi)
13. [Pengaturan](#13-pengaturan)
14. [Manajemen User](#14-manajemen-user)
15. [Manajemen PT (Perusahaan)](#15-manajemen-pt-perusahaan)
16. [Export Data](#16-export-data)
17. [Push Notification](#17-push-notification)
18. [Instalasi PWA](#18-instalasi-pwa)
19. [Tips & FAQ](#19-tips--faq)

---

## 1. Pendahuluan

**SG Control Center (SGCC)** adalah aplikasi web internal yang digunakan oleh jajaran direksi dan manajemen Grup SG untuk memantau dan mengelola:

- Aktivitas penting harian DU/DK di 5 perusahaan
- Kasus pengaduan nasabah dan proses penyelesaiannya
- Pemberian dan monitoring tugas
- Komunikasi internal via pengumuman dan pesan
- Penilaian kinerja (KPI) direksi

Aplikasi ini menggunakan bahasa Indonesia sepenuhnya dan dapat diakses melalui browser desktop maupun mobile (termasuk bisa di-install sebagai aplikasi/PWA).

### Perusahaan yang Dipantau

1. PT Solid Gold Berjangka (SGB)
2. PT Rifan Financindo Berjangka (RFB)
3. PT Best Profit Futures (BPF)
4. PT Kontak Perkasa Futures (KPF)
5. PT Equityworld Futures (EWF)

---

## 2. Akses & Login

### Cara Login

1. Buka aplikasi SGCC di browser
2. Masukkan **Username** dan **Password**
3. (Opsional) Centang **Ingat Saya** agar tetap login selama 30 hari. Jika tidak dicentang, sesi login akan berakhir dalam 8 jam
4. Klik tombol **Masuk**

### Keamanan Login

- Jika password salah 5 kali berturut-turut, akun akan **terkunci selama 15 menit**
- Sistem akan menampilkan jumlah percobaan login yang sudah dilakukan (contoh: "Percobaan 3/5")

### Lupa Password

1. Di halaman login, klik link **Lupa Password**
2. Masukkan username Anda
3. Jawab pertanyaan rahasia yang sudah Anda atur sebelumnya
4. Masukkan password baru (minimal 8 karakter)
5. Klik **Simpan**

> **Catatan:** Pertanyaan rahasia harus diatur terlebih dahulu melalui halaman Pengaturan. Jika belum diatur, hubungi Superadmin untuk reset password.

---

## 3. Navigasi Aplikasi

### Sidebar (Menu Samping)

Setelah login, Anda akan melihat sidebar di sisi kiri yang berisi menu navigasi:

| Menu | Fungsi | Tersedia Untuk |
|------|--------|----------------|
| Dashboard | Ringkasan statistik | Semua role |
| Aktivitas | Daftar aktivitas | Semua role |
| Kasus Pengaduan | Daftar kasus nasabah | Semua role |
| Tugas | Daftar tugas | Semua role |
| KPI | Penilaian kinerja | Semua role |
| Pengumuman | Pengumuman resmi | Semua role |
| Pesan | Pesan pribadi | Semua role |
| Notifikasi | Pemberitahuan | Semua role |
| Pengaturan | Ganti password, dll. | Semua role |
| Manajemen User | Kelola akun pengguna | Superadmin |
| Manajemen PT | Kelola data perusahaan | Superadmin |

### Navigasi Halaman

- **Tombol Kembali (←):** Muncul di semua halaman kecuali Dashboard, untuk kembali ke halaman sebelumnya
- **Tombol Home (🏠):** Muncul di semua halaman kecuali Dashboard, untuk langsung ke Dashboard
- **Klik logo/nama "SG Control Center"** di sidebar: Kembali ke Dashboard
- **Di mobile:** Sidebar tampil sebagai drawer (tekan ikon hamburger di kiri atas untuk membuka)

---

## 4. Penjelasan Role Pengguna

### Superadmin

- Melihat data **semua perusahaan**
- Mengelola akun pengguna (buat, edit, nonaktifkan)
- Mengelola data perusahaan dan cabang
- Membuat tugas dan pengumuman
- Melihat dan membuat penilaian KPI semua DU/DK
- Membuat aktivitas dan kasus pengaduan (didukung oleh API, namun tombol buat hanya tampil di antarmuka untuk DU/DK)

### Owner

- Melihat data **semua perusahaan**
- Membuat tugas dan pengumuman
- Melihat dan membuat penilaian KPI semua DU/DK
- Melihat panel "Kesibukan DU/DK" di halaman Aktivitas
- Menghapus kasus, aktivitas, tugas

### Direktur Utama (DU)

- Melihat dan mengelola data **perusahaan sendiri** saja
- Membuat dan mengedit aktivitas sendiri
- Membuat dan mengedit kasus pengaduan sendiri
- Mengupdate progress tugas yang diberikan kepadanya
- Melihat KPI **milik sendiri** saja

### Direktur Kepatuhan (DK)

- Sama dengan DU — melihat dan mengelola data **perusahaan sendiri** saja
- Membuat dan mengedit aktivitas sendiri
- Membuat dan mengedit kasus pengaduan sendiri
- Mengupdate progress tugas yang diberikan kepadanya
- Melihat KPI **milik sendiri** saja

---

## 5. Dashboard

Dashboard adalah halaman utama yang menampilkan ringkasan statistik. Data yang ditampilkan tergantung pada role Anda:

### Kartu Statistik (Baris Atas)

| Kartu | Keterangan |
|-------|------------|
| Total Aktivitas | Jumlah seluruh aktivitas |
| Kasus Aktif | Jumlah kasus yang masih open/in progress |
| Tugas Pending | Jumlah tugas yang belum selesai |
| Pengumuman | Jumlah pengumuman aktif |

### Kartu Statistik (Baris Bawah)

| Kartu | Keterangan |
|-------|------------|
| Aktivitas Selesai | Jumlah aktivitas yang sudah selesai (dari total) |
| Kasus Selesai | Jumlah kasus yang sudah ditutup (dari total) |
| Tugas Selesai | Jumlah tugas yang sudah selesai (dari total) |

### Tips

- Klik pada kartu statistik untuk langsung membuka halaman terkait
- Superadmin/Owner melihat data gabungan semua perusahaan
- DU/DK hanya melihat data perusahaan sendiri

---

## 6. Aktivitas

Halaman ini digunakan untuk mencatat dan memantau aktivitas penting yang dilakukan oleh DU/DK.

### Melihat Daftar Aktivitas

1. Buka menu **Aktivitas** di sidebar
2. Daftar aktivitas akan ditampilkan dalam bentuk kartu
3. Setiap kartu menampilkan: tanggal, judul, status, prioritas, dan progress

### Filter & Pencarian

- **Pencarian:** Ketik kata kunci di kolom pencarian untuk mencari berdasarkan judul
- **Filter Status:** Filter berdasarkan status (Direncanakan, Berjalan, Selesai, Ditunda, Dibatalkan)
- **Filter PT:** Filter berdasarkan perusahaan (hanya untuk Superadmin/Owner)
- **Filter Prioritas:** Filter berdasarkan prioritas (Low, Medium, High)
- **Filter Personil:** Filter berdasarkan pembuat aktivitas
- **Sortir:** Urutkan berdasarkan tanggal, prioritas, atau progress

### Membuat Aktivitas Baru

> Tersedia untuk: DU, DK (tombol hanya tampil untuk DU/DK di antarmuka)

1. Klik tombol **Tambah Aktivitas**
2. Isi form:
   - **Tanggal** (wajib)
   - **Status** — pilih dari dropdown
   - **Judul** (wajib)
   - **Deskripsi** — penjelasan singkat
   - **Kategori** — pilih dari daftar kategori
   - **Prioritas** — Low, Medium, atau High
   - **Progress** — persentase 0-100
   - **Tanggal Target** — target penyelesaian
   - **Tindakan Selanjutnya** — rencana lanjutan
3. Klik **Simpan**

### Mengedit Aktivitas

> Hanya pembuat aktivitas atau Superadmin yang dapat mengedit

1. Klik tombol **Edit (ikon pensil)** pada kartu aktivitas
2. Ubah data yang diperlukan
3. Klik **Simpan**

### Menghapus Aktivitas

> Hanya pembuat, Owner, atau Superadmin yang dapat menghapus

1. Klik tombol **Hapus (ikon tempat sampah)** pada kartu aktivitas
2. Konfirmasi penghapusan pada dialog yang muncul

### Detail Aktivitas

1. Klik pada kartu aktivitas untuk membuka halaman detail
2. Di halaman detail, Anda dapat:
   - Melihat informasi lengkap aktivitas
   - Menambahkan komentar/diskusi
   - Melihat riwayat komentar

### Panel Kesibukan DU/DK

> Hanya tampil untuk Superadmin dan Owner

Di bagian atas halaman Aktivitas, terdapat panel yang menampilkan ringkasan kesibukan setiap DU/DK:
- Jumlah aktivitas hari ini, minggu ini, total
- Rata-rata progress
- Indikator beban kerja: **Ringan** (0-1 aktivitas/hari), **Normal** (2-3), **Padat** (4+)
- Klik nama DU/DK untuk memfilter aktivitas orang tersebut

---

## 7. Kasus Pengaduan

Halaman ini digunakan untuk mengelola kasus pengaduan nasabah, termasuk pelacakan timeline dan pertemuan.

### Melihat Daftar Kasus

1. Buka menu **Kasus Pengaduan** di sidebar
2. Daftar kasus ditampilkan dengan informasi: kode kasus, nama nasabah, no. akun, risiko, status, progress

### Filter & Pencarian

- **Pencarian:** Cari berdasarkan kode kasus, nama nasabah, atau nomor akun
- **Filter Risiko:** Low, Medium, High
- **Filter PT:** Pilih perusahaan (Superadmin/Owner)
- **Filter Cabang:** Muncul dinamis setelah memilih PT
- **Filter Bucket:** Tahap pemeriksaan
- **Filter Stage:** Open, Investigation, Resolution, Closed
- **Filter Jalur Penyelesaian:** Mediasi Internal, Mediasi BBJ, dll.
- **Sortir:** Urutkan berdasarkan tanggal, risiko, atau progress

### Membuat Kasus Baru

> Tersedia untuk: DU, DK (tombol hanya tampil untuk DU/DK di antarmuka)

1. Klik tombol **Tambah Kasus**
2. Isi form (field yang wajib ditandai *):
   - **Tanggal Diterima** (wajib)
   - **Nama Nasabah** (wajib)
   - **No. Akun**
   - **Cabang** — pilih dari cabang perusahaan
   - **Nama WPB**
   - **Nama Manager**
   - **PIC Utama**
   - **Ringkasan Kasus** (wajib)
   - **Risiko** — Low, Medium, High
   - **Prioritas** — Low, Medium, High
   - **Bucket** — pilih tahap pemeriksaan
   - **Jalur Penyelesaian** — pilih jalur
   - **Tanggal Target**
   - **Temuan**, **Akar Masalah**, **Permintaan Nasabah**, **Penawaran Perusahaan**
3. Klik **Simpan**

### Detail Kasus

Klik pada kasus untuk membuka halaman detail yang memiliki beberapa tab:

#### Tab Detail

- Informasi lengkap kasus
- Form edit (untuk creator/superadmin)
- Catatan dari Owner, DU, DK

#### Tab Timeline

- Riwayat perubahan/update kasus secara kronologis
- Tambahkan update baru dengan konten, perubahan stage, dan progress

#### Tab Pertemuan

- Daftar pertemuan terkait kasus
- Tambahkan pertemuan baru:
  - Tanggal pertemuan
  - Tipe: Mediasi Nasabah, Musyawarah Pialang, Mediasi BBJ, Sidang Bappebti, Negosiasi Internal, Lainnya
  - Peserta
  - Lokasi
  - Hasil
  - Catatan

#### Tab Komentar

- Thread diskusi tentang kasus
- Semua user yang memiliki akses dapat berkomentar

### Ringkasan Statistik

Di bagian atas halaman Kasus, terdapat ringkasan statistik yang menampilkan breakdown kasus per Jalur Penyelesaian.

---

## 8. Tugas

Halaman ini digunakan untuk memberikan dan memantau tugas dari manajemen (Superadmin/Owner) kepada DU/DK.

### Melihat Daftar Tugas

1. Buka menu **Tugas** di sidebar
2. DU/DK hanya melihat tugas yang ditujukan untuk mereka
3. Superadmin/Owner melihat semua tugas

### Filter & Pencarian

- **Pencarian:** Cari berdasarkan judul tugas
- **Filter Status:** Baru, Dalam Proses, Selesai
- **Filter Prioritas:** Low, Medium, High
- **Filter Penerima:** Pilih DU/DK tertentu
- **Sortir:** Urutkan berdasarkan deadline, prioritas, atau progress

### Membuat Tugas Baru

> Tersedia untuk: Superadmin, Owner

1. Klik tombol **Tambah Tugas**
2. Isi form:
   - **Judul** (wajib)
   - **Deskripsi**
   - **Penerima Tugas** (wajib) — pilih DU/DK
   - **Perusahaan** — otomatis sesuai penerima
   - **Prioritas** — Low, Medium, High
   - **Deadline** — tanggal batas
   - **Catatan**
3. Klik **Simpan**

Penerima tugas akan menerima notifikasi otomatis.

### Mengupdate Progress Tugas (DU/DK)

1. Klik tombol **Edit** pada tugas
2. DU/DK hanya dapat mengubah:
   - **Status** — Baru → Dalam Proses → Selesai
   - **Progress** — 0-100%
   - **Catatan**
3. Klik **Simpan**

### Mengedit Tugas (Superadmin/Owner)

Superadmin dan Owner dapat mengedit semua field tugas: judul, deskripsi, penerima, perusahaan, prioritas, deadline, catatan.

### Menghapus Tugas

> Hanya Superadmin dan Owner

1. Klik tombol **Hapus** pada tugas
2. Konfirmasi penghapusan

---

## 9. Pengumuman

Halaman ini digunakan untuk menyampaikan pengumuman resmi dari manajemen.

### Melihat Pengumuman

1. Buka menu **Pengumuman** di sidebar
2. Pengumuman yang disematkan (pinned) tampil di atas
3. Klik pengumuman untuk melihat isi lengkap

### Membuat Pengumuman

> Tersedia untuk: Superadmin, Owner

1. Klik tombol **Buat Pengumuman**
2. Isi form:
   - **Judul** (wajib)
   - **Isi Pengumuman** (wajib)
   - **Prioritas** — Normal, Penting, Urgent
   - **Target** — Semua, Role tertentu, Perusahaan tertentu, User tertentu (multi-select)
   - **Tanggal Mulai** (wajib)
   - **Tanggal Berakhir** (opsional)
   - **Sematkan** — centang untuk pin di atas
3. Klik **Simpan**

Penerima target akan mendapat notifikasi otomatis.

### Status Baca

- Sistem mencatat siapa yang sudah membaca setiap pengumuman
- Semua pengguna yang login dapat melihat daftar pembaca pengumuman

### Mengedit & Menghapus

- **Edit:** Klik ikon pensil (pembuat atau Superadmin)
- **Hapus:** Klik ikon tempat sampah (pembuat atau Superadmin)

---

## 10. Pesan

Fitur pesan digunakan untuk komunikasi privat antar pengguna.

### Melihat Pesan

1. Buka menu **Pesan** di sidebar
2. Pesan masuk dan keluar ditampilkan dalam daftar
3. Pesan belum dibaca ditandai dengan indikator

### Mengirim Pesan

1. Klik tombol **Kirim Pesan Baru**
2. Pilih penerima — bisa memilih beberapa penerima sekaligus menggunakan checkbox
   - Gunakan **Pilih Semua** untuk memilih semua penerima
3. Isi subjek (opsional) dan konten pesan (wajib)
4. Jika perlu arahan dari atasan, centang opsi **Perlu Arahan**
5. Klik **Kirim**

### Tips

- Pesan dapat dikirim ke banyak penerima sekaligus
- Pesan yang belum dibaca lebih dari 24 jam akan memicu pengingat otomatis kepada penerima

---

## 11. Notifikasi

Sistem notifikasi memberitahu Anda tentang aktivitas penting yang terkait dengan pekerjaan Anda.

### Jenis Notifikasi

| Kategori | Contoh |
|----------|--------|
| Aktivitas | Aktivitas baru dibuat |
| Kasus | Kasus baru, kasus risiko tinggi, kasus selesai |
| Tugas | Tugas baru diberikan, tugas selesai |
| Komentar | Ada komentar baru pada entitas terkait |
| Pesan | Pesan baru diterima |
| Pengumuman | Pengumuman baru dipublikasikan |
| Pertemuan | Pertemuan kasus baru dijadwalkan |
| Pengingat | Tugas overdue, kasus/tugas belum difollow-up, pesan belum dibaca |
| Ringkasan | Ringkasan harian (jam 8 WIB) |

> **Catatan:** Notifikasi untuk update rutin (edit aktivitas/kasus/tugas) saat ini dinonaktifkan untuk mengurangi noise. Hanya event penting yang memicu notifikasi.

### Mengelola Notifikasi

1. Buka menu **Notifikasi** di sidebar
2. Klik notifikasi untuk melihat detail — otomatis ditandai sudah dibaca
3. Gunakan tombol:
   - **Tandai Semua Dibaca** — menandai semua notifikasi sebagai sudah dibaca
   - **Hapus Sudah Dibaca** — menghapus semua notifikasi yang sudah dibaca
   - **Hapus Semua** — menghapus seluruh notifikasi

### Pengingat Otomatis

Sistem secara otomatis mengirimkan pengingat untuk:
- **Tugas overdue** — tugas yang melewati deadline
- **Kasus stale** — kasus yang tidak diperbarui lebih dari 7 hari
- **Tugas stale** — tugas dengan progress <50% dan sudah lebih dari 7 hari
- **Pesan belum dibaca** — pesan yang belum dibaca lebih dari 24 jam
- **Ringkasan harian** — jam 8 pagi WIB untuk Superadmin & Owner (jika ada item yang perlu perhatian)

> Notifikasi secara otomatis dihapus setelah lebih dari 7 hari.

---

## 12. Penilaian KPI

Halaman KPI digunakan untuk memantau dan menilai kinerja DU dan DK.

### KPI Live (Tab Pertama)

KPI Live menampilkan skor kinerja yang dihitung secara **real-time** berdasarkan data operasional.

#### Untuk Superadmin/Owner:

1. Buka menu **KPI** di sidebar
2. Tab **KPI Live** menampilkan:
   - **Papan Peringkat** — DU dan DK ditampilkan terpisah, masing-masing ranking 1-5
   - **Daftar skor KPI** semua DU/DK dengan grade (A/B/C/D)
   - **Detail per orang** — klik untuk melihat breakdown 9 aspek penilaian
   - **Radar chart** — visualisasi grafik laba-laba untuk 9 aspek

#### Untuk DU/DK:

- Hanya melihat skor KPI **milik sendiri**
- Radar chart dan breakdown aspek tetap ditampilkan

### 9 Aspek Penilaian

| No | Aspek | Bobot | Keterangan |
|----|-------|-------|------------|
| 1 | Penyelesaian Kasus | 15% | Persentase kasus yang diselesaikan dari total kasus |
| 2 | Penyelesaian Tugas | 10% | Persentase tugas yang diselesaikan dari total tugas |
| 3 | Penyelesaian Aktivitas | 10% | Persentase aktivitas yang selesai dari total aktivitas |
| 4 | Ketepatan Waktu | 15% | Persentase item yang diselesaikan tepat waktu (sebelum/pada deadline) |
| 5 | Beban Kerja | 15% | Perbandingan jumlah item kerja dengan rata-rata peers (DU/DK lain) |
| 6 | Progress Rata-rata | 10% | Rata-rata progress dari semua aktivitas, kasus, dan tugas |
| 7 | Responsivitas | 10% | Seberapa kecil jumlah item yang overdue dibanding item aktif |
| 8 | Kontribusi Aktif | 10% | Komentar dan update pada kasus (termasuk kasus high-risk), dibandingkan dengan peers |
| 9 | Konsistensi | 5% | Rasio item yang sudah selesai dari seluruh item |

### Grade

| Grade | Rentang Skor |
|-------|-------------|
| **A** (Sangat Baik) | 85 - 100 |
| **B** (Baik) | 70 - 84 |
| **C** (Cukup) | 55 - 69 |
| **D** (Perlu Perbaikan) | 0 - 54 |

### Dasar Penilaian

Di setiap tampilan KPI terdapat section **"Dasar Penilaian"** yang bisa diklik untuk melihat penjelasan lengkap tentang rumus perhitungan, sumber data, bobot, dan grade.

### Riwayat Penilaian (Tab Kedua)

> Tersedia untuk: Superadmin, Owner

1. Klik tab **Riwayat Penilaian**
2. Pilih DU/DK yang akan dinilai
3. Pilih periode (contoh: 2026-Q1)
4. Sistem akan menghitung skor berdasarkan data live saat itu
5. Tambahkan catatan coaching:
   - **Kekuatan** — apa yang sudah baik
   - **Area Perbaikan** — apa yang perlu ditingkatkan
   - **Catatan Coaching** — masukan tambahan
6. Klik **Simpan Penilaian**

Penilaian yang sudah disimpan menjadi **snapshot** yang tidak berubah, meskipun data operasional berubah setelahnya.

---

## 13. Pengaturan

### Ganti Password

1. Buka menu **Pengaturan** di sidebar
2. Di bagian **Ganti Password**:
   - Masukkan password lama
   - Masukkan password baru (minimal 8 karakter)
   - Konfirmasi password baru
3. Klik **Simpan**

### Push Notification

1. Di halaman Pengaturan, terdapat kartu **Push Notification**
2. Klik toggle untuk mengaktifkan atau menonaktifkan push notification
3. Browser akan meminta izin notifikasi — klik **Izinkan**
4. Setelah aktif, Anda akan menerima notifikasi pop-up meskipun browser tidak sedang dibuka

### Pertanyaan Rahasia

- Pertanyaan dan jawaban rahasia digunakan untuk fitur "Lupa Password"
- Pertanyaan rahasia diatur saat pembuatan akun oleh Superadmin
- Jika belum diatur, hubungi Superadmin untuk mengatur pertanyaan rahasia Anda

### Update Profil

1. Buka menu profil atau navigasi ke **Update Profil**
2. Lengkapi data:
   - Nomor telepon
   - Alamat
   - Tanggal lahir
   - Jabatan
   - Foto profil (upload/hapus)
3. Klik **Simpan**

---

## 14. Manajemen User

> Hanya tersedia untuk: **Superadmin**

### Melihat Daftar User

1. Buka menu **Manajemen User** di sidebar
2. Daftar semua user ditampilkan
3. User yang dinonaktifkan ditandai dengan badge "Nonaktif"

### Membuat User Baru

1. Klik tombol **Tambah User**
2. Isi form:
   - **Username** (wajib, unik)
   - **Password** (wajib, minimal 8 karakter)
   - **Nama Lengkap** (wajib)
   - **Role** — Superadmin, Owner, DU, atau DK
   - **Perusahaan** — wajib untuk DU/DK
   - **Nomor Telepon**
   - **Jabatan**
3. Klik **Simpan**

### Mengedit User

1. Klik tombol **Edit** pada user yang ingin diubah
2. Ubah data yang diperlukan
3. Klik **Simpan**

### Menonaktifkan User

1. Klik tombol **Nonaktifkan** pada user
2. Konfirmasi aksi
3. User yang dinonaktifkan tidak bisa login
4. Tidak bisa menonaktifkan diri sendiri atau superadmin lain

### Mengaktifkan Kembali User

1. Pada user yang nonaktif, klik tombol **Aktifkan Kembali**
2. User dapat login kembali

### Reset Password User

1. Klik tombol **Reset Password** pada user
2. Masukkan password baru
3. Klik **Simpan**
4. Akun user yang terkunci akan otomatis dibuka

---

## 15. Manajemen PT (Perusahaan)

> Hanya tersedia untuk: **Superadmin**

### Melihat Daftar Perusahaan

1. Buka menu **Manajemen PT** di sidebar
2. 5 perusahaan ditampilkan dalam bentuk kartu
3. Klik kartu untuk melihat detail

### Detail Perusahaan

Halaman detail menampilkan beberapa bagian:

#### Informasi Perusahaan

- Nama, kode, alamat, telepon, email
- Nama direktur, tanggal berdiri, nomor izin

#### Daftar Cabang

- Lihat semua cabang perusahaan
- **Tambah Cabang:** Nama, alamat, kepala cabang, jumlah WPB
- **Edit Cabang:** Ubah data cabang
- **Hapus Cabang:** Menonaktifkan cabang (soft-delete, data tetap tersimpan)

#### Rekap Statistik

- Ringkasan jumlah kasus, aktivitas, tugas, dan pengumuman
- Memudahkan monitoring performa per perusahaan

#### Daftar Pengurus

- Lihat DU dan DK yang bertugas di perusahaan tersebut

---

## 16. Export Data

Anda dapat mengunduh data dalam 3 format:

### Format yang Tersedia

| Format | Kegunaan |
|--------|----------|
| **PDF** | Laporan formal, cetak |
| **Excel (.xlsx)** | Analisis data, spreadsheet |
| **Word (.docx)** | Dokumen resmi, surat |

### Cara Export

1. Buka halaman yang ingin di-export (Aktivitas, Kasus, atau Tugas)
2. Klik tombol **Download** (ikon unduh) di bagian atas
3. Pilih format yang diinginkan: PDF, Excel, atau Word
4. File akan otomatis terunduh ke komputer Anda

### Halaman yang Mendukung Export

- **Aktivitas** — export daftar aktivitas
- **Kasus Pengaduan** — export daftar kasus
- **Tugas** — export daftar tugas

> Data yang di-export adalah data yang sedang ditampilkan (sudah difilter).

---

## 17. Push Notification

Push notification memungkinkan Anda menerima pemberitahuan langsung di perangkat meskipun browser sedang tertutup.

### Cara Mengaktifkan

#### Dari Pengaturan:

1. Buka **Pengaturan**
2. Di bagian **Push Notification**, klik toggle **Aktifkan**
3. Jika browser menampilkan dialog izin, klik **Izinkan**

#### Dari Sidebar:

- Jika belum mengaktifkan push, akan muncul banner di sidebar yang mengajak Anda mengaktifkan
- Klik banner tersebut untuk mengaktifkan
- Banner bisa ditutup (dismiss) jika belum ingin mengaktifkan

### Cara Menonaktifkan

1. Buka **Pengaturan**
2. Klik toggle **Nonaktifkan** pada bagian Push Notification

### Notifikasi Push yang Dikirim

Notifikasi in-app juga dikirim sebagai push notification, termasuk:
- Aktivitas baru dibuat
- Kasus baru, kasus risiko tinggi, kasus selesai
- Tugas baru diberikan, tugas selesai, tugas overdue
- Komentar baru
- Pesan baru diterima
- Pengumuman baru
- Pertemuan kasus baru
- Semua pengingat otomatis (stale, overdue, ringkasan harian)

> **Catatan:** Notifikasi untuk update rutin aktivitas/kasus/tugas saat ini dinonaktifkan untuk mengurangi noise. Hanya event penting (baru dibuat, selesai, risiko tinggi, overdue) yang memicu notifikasi.

### Klik Notifikasi

Klik pada notifikasi push akan langsung membuka halaman terkait di aplikasi.

---

## 18. Instalasi PWA

SGCC dapat di-install sebagai aplikasi di perangkat Anda untuk pengalaman yang lebih baik.

### Di Chrome (Desktop)

1. Buka aplikasi SGCC di Chrome
2. Klik ikon **Install** (⊕) di address bar, atau
3. Klik menu titik tiga (⋮) > **Install SG Control Center**
4. Klik **Install** pada dialog konfirmasi

### Di Chrome (Android)

1. Buka aplikasi SGCC di Chrome
2. Ketuk menu titik tiga (⋮)
3. Ketuk **Add to Home Screen** atau **Install App**
4. Ketuk **Install**

### Di Safari (iOS)

1. Buka aplikasi SGCC di Safari
2. Ketuk ikon **Share** (kotak dengan panah ke atas)
3. Scroll ke bawah dan ketuk **Add to Home Screen**
4. Ketuk **Add**

### Keuntungan PWA

- Tampilan layar penuh (tanpa address bar browser)
- Akses cepat dari home screen
- Notifikasi push aktif
- Pengalaman seperti aplikasi native

---

## 19. Tips & FAQ

### Tips Penggunaan

1. **Aktifkan push notification** agar tidak ketinggalan informasi penting
2. **Centang "Ingat Saya"** saat login jika menggunakan perangkat pribadi
3. **Gunakan filter** untuk menemukan data dengan cepat di halaman daftar
4. **Lengkapi profil** termasuk pertanyaan rahasia untuk keamanan akun
5. **Export data** secara berkala untuk arsip dan laporan
6. **Perhatikan notifikasi pengingat** — ini menandakan ada item yang butuh perhatian Anda

### FAQ

**T: Saya lupa password, bagaimana cara reset?**
J: Klik "Lupa Password" di halaman login, masukkan username, jawab pertanyaan rahasia, lalu buat password baru. Jika pertanyaan rahasia belum diatur, hubungi Superadmin.

**T: Akun saya terkunci, apa yang harus dilakukan?**
J: Tunggu 15 menit dan coba lagi, atau hubungi Superadmin untuk mereset password Anda (akun otomatis terbuka).

**T: Kenapa saya tidak bisa melihat data perusahaan lain?**
J: Jika role Anda DU atau DK, Anda hanya bisa melihat data perusahaan sendiri. Ini adalah pengaturan keamanan sistem.

**T: Kenapa saya tidak bisa membuat tugas/pengumuman?**
J: Fitur pembuatan tugas dan pengumuman hanya tersedia untuk Superadmin dan Owner.

**T: Kenapa tombol "Tambah Kasus" tidak muncul?**
J: Tombol ini hanya tampil di antarmuka untuk DU dan DK. Superadmin dan Owner tidak melihat tombol ini di halaman Kasus.

**T: Bagaimana cara melihat siapa yang sudah membaca pengumuman?**
J: Semua pengguna yang sudah login dapat melihat daftar pembaca di halaman detail pengumuman.

**T: Data yang di-export tidak sesuai, kenapa?**
J: Data yang di-export adalah data yang sedang ditampilkan sesuai filter yang aktif. Pastikan filter sudah diatur dengan benar sebelum export.

**T: Push notification tidak muncul, kenapa?**
J: Pastikan Anda sudah mengaktifkan push notification di Pengaturan dan memberikan izin notifikasi di browser. Beberapa browser di mobile mungkin memerlukan pengaturan tambahan.

**T: Kenapa KPI saya menunjukkan skor 0?**
J: Skor KPI dihitung dari data operasional. Jika Anda belum memiliki aktivitas, kasus, atau tugas, skor akan tetap 0.

**T: Apakah penilaian KPI bisa diubah setelah disimpan?**
J: Tidak. Penilaian KPI yang sudah disimpan menjadi snapshot permanen. Untuk penilaian baru, buat penilaian di periode berikutnya.

**T: Bagaimana cara menggunakan aplikasi di HP?**
J: Buka SGCC di browser HP, lalu install sebagai PWA (lihat panduan di Bab 18). Semua fitur tersedia dan tampilan sudah dioptimalkan untuk mobile.

---

*Dokumen ini adalah panduan penggunaan SG Control Center (SGCC). Untuk pertanyaan teknis, silakan merujuk ke Dokumentasi Teknis.*
