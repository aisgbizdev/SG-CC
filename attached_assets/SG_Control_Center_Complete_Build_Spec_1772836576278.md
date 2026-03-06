
# SG CONTROL CENTER — COMPLETE BUILD SPECIFICATION
Versi Final untuk Replit Agent (Rere)

## 1. Identitas Produk
**Nama aplikasi:** SG Control Center  
**Singkatan internal:** SGCC  
**Bahasa aplikasi:** Bahasa Indonesia  
**Warna utama UI:** Navy Blue  
**Tipe aplikasi:** Web App + PWA (Progressive Web App)  
**Tujuan utama:** Sistem monitoring aktivitas, pengaduan, progress, komunikasi, dan pelaporan untuk 5 PT dalam group SG.

## 2. Tujuan Sistem
Aplikasi ini bukan CRM marketing, bukan ERP umum, dan bukan aplikasi chat utama.  
Aplikasi ini adalah **pusat kendali internal level direksi** untuk:
1. Mencatat aktivitas penting harian level Direktur Utama (DU) dan Direktur Kepatuhan (DK)
2. Mencatat dan menangani kasus/pengaduan
3. Memonitor progress pekerjaan, target, overdue, dan aging
4. Memberikan ruang komentar, arahan, pengumuman, dan task assignment
5. Menghasilkan laporan otomatis untuk boss/owner dalam format operasional dan executive summary
6. Menyediakan notifikasi dan alert sesuai role

Aplikasi harus terasa seperti **Executive Governance & Compliance Monitoring System**, bukan aplikasi operasional cabang, bukan aplikasi yang terlalu teknis, dan bukan aplikasi ramai dengan banyak input dari banyak level.

## 3. Prinsip Desain Sistem
Prinsip yang harus diikuti saat membangun aplikasi:
1. Sederhana dan mudah dipakai
2. Fokus untuk user level direksi
3. Input tidak boleh terlalu rumit
4. Dashboard harus bisa dibaca cepat
5. Banyak visual indicator, sedikit gesekan
6. Data inti harus rapi dan terkontrol
7. Banyak yang boleh melihat, sedikit yang boleh mengubah
8. Form mengikuti kebutuhan output laporan, bukan sebaliknya
9. Fitur jangan berlebihan di versi awal
10. Semua menu dan istilah menggunakan Bahasa Indonesia

## 4. Platform dan Teknologi yang Diinginkan

### Platform
- Web based
- Mobile friendly
- PWA installable
- Bisa dibuka di laptop, desktop, tablet, dan HP
- Bisa mengirim notifikasi browser/push notification jika diizinkan user

### Rekomendasi stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: bebas, tetapi lebih baik yang stabil dan mudah dibaca
- PWA: vite-plugin-pwa
- Export report: PDF, Excel, Word
- Auth: username + password, tanpa email

### Catatan
Jangan gunakan arsitektur yang terlalu berat. Prioritaskan kestabilan, maintainability, dan kejelasan struktur folder.

## 5. Struktur Akses dan Role

### 5.1 Superadmin
Jumlah: 2 orang

**Tujuan role:** pengendali sistem dan editor inti.

**Hak akses:**
- Melihat semua PT
- Melihat semua dashboard
- Menambah, mengedit, mengarsipkan data inti
- Mengelola user
- Mengelola role
- Mengelola PT
- Mengelola template import Excel
- Mengelola template report
- Mengelola kategori master
- Mengelola notifikasi sistem
- Mengelola pengaturan aplikasi
- Melihat log sistem
- Melakukan reset password user jika diperlukan

**Catatan penting:** hanya Superadmin yang boleh mengedit semua data inti.

### 5.2 Owner
Jumlah: 5 orang

**Tujuan role:** pihak level atas yang memonitor semua PT, memberi arahan, komentar, pengumuman, dan task.

**Hak akses:**
- Melihat semua PT
- Melihat semua dashboard grup
- Melihat semua aktivitas
- Melihat semua kasus
- Memberi komentar pada aktivitas, kasus, dan task
- Mengirim pengumuman
- Mengirim pesan privat
- Membuat task assignment
- Export laporan
- Menggunakan filter lintas PT
- Melihat report grup dan report per PT

**Tidak boleh:**
- Mengedit data inti kasus atau aktivitas
- Menghapus data
- Mengubah pengaturan sistem
- Mengelola user

### 5.3 Direktur Utama (DU)
Per PT ada 1 DU.

**Tujuan role:** penginput dan reviewer utama di level PT.

**Hak akses:**
- Input aktivitas
- Input kasus
- Update progress
- Melihat semua data PT sendiri
- Memberi komentar pada aktivitas/kasus DK di PT yang sama
- Menerima task
- Membuat update pada thread diskusi
- Melihat pengumuman dan notifikasi PT-nya
- Export laporan PT tertentu jika diizinkan

**Catatan struktur:** DU berada di atas DK.

### 5.4 Direktur Kepatuhan (DK)
Per PT ada 1 DK.

**Tujuan role:** penginput utama untuk aktivitas kepatuhan dan pengaduan.

**Hak akses:**
- Input aktivitas
- Input kasus
- Update progress
- Melihat data PT sendiri
- Membaca komentar dari DU dan Owner
- Membalas thread diskusi
- Menerima task
- Melihat pengumuman dan notifikasi

**Batasan:**
- Tidak mengubah data DU
- Tidak punya otoritas ke atas
- Tidak melihat PT lain

## 6. Siapa yang Input ke Sistem
Input aktif hanya dilakukan oleh:
- DU
- DK

Cabang tidak input langsung ke sistem.

**Alasan:**
- Mengurangi keribetan
- Mengurangi risiko miss input
- Menjaga kualitas data
- Membuat sistem realistis dipakai
- Menjadikan DK dan DU sebagai gatekeeper resmi

Cabang tetap bisa mengirim data ke DK/DU di luar sistem, lalu DK/DU memutuskan apa yang masuk ke sistem.

## 7. Arsitektur Data Antar PT
Gunakan **1 database pusat** dengan konsep **multi-company architecture**.
Semua tabel utama harus memiliki kolom `company_id`.

**Alasan:**
- Owner bisa lihat semua PT
- Dashboard grup lebih mudah
- Report lintas PT lebih mudah
- Maintenance lebih sederhana
- Tidak perlu 5 sistem terpisah

**Pembatasan akses dilakukan lewat:**
- Role
- company_id
- permission logic

## 8. Sistem Login dan Keamanan

### 8.1 Metode Login
Login menggunakan:
- username
- password

Tidak perlu email.

### 8.2 Perubahan Password
Setiap user bisa mengganti password sendiri setelah login.

### 8.3 Lupa Password
Sediakan fitur lupa password berbasis:
- secret question
- secret answer

Contoh secret question:
- Nama ibu kandung
- Kota lahir
- Nama sekolah pertama
- Nama hewan peliharaan

User memilih dan menyimpan sendiri saat akun dibuat atau saat pertama kali login.

### 8.4 Aturan keamanan minimal
- Password minimal 8 karakter
- Kombinasi huruf dan angka
- Batas percobaan login gagal 5 kali
- Akun dikunci sementara jika gagal berulang
- Session timeout jika tidak aktif
- Password disimpan dalam bentuk hash, bukan plain text

## 9. Struktur Menu Utama
Menu utama untuk user normal:
1. Dashboard
2. Aktivitas
3. Kasus Pengaduan
4. Tugas
5. Pengumuman
6. Pesan
7. Laporan
8. Notifikasi
9. Pencarian
10. Pengaturan

Menu tambahan khusus Superadmin:
11. Manajemen User
12. Manajemen PT
13. Template Import
14. Log Sistem
15. Master Kategori

## 10. Desain UI / UX

### 10.1 Gaya visual
- Bersih
- Formal
- Modern
- Ringan
- Executive style
- Dominan navy blue
- Banyak ruang kosong yang rapi
- Tidak terlalu padat
- Tidak seperti aplikasi akuntansi atau ERP lama

### 10.2 Warna
- Primary: Navy Blue
- Secondary: White
- Support: Light Gray
- Status:
  - Hijau = On Track
  - Kuning = Warning
  - Merah = Overdue
  - Abu gelap = Closed

### 10.3 Prinsip UX
- Maksimal 3 klik untuk aksi utama
- Banyak dropdown dibanding text input bebas
- Dashboard harus bisa dibaca dalam 5 detik
- Form harus dibagi sesuai kebutuhan, jangan menakutkan
- Sediakan quick add
- Sediakan search global
- Sediakan filter cepat
- Sediakan progress bar visual
- Sediakan badge warna

## 11. Modul 1 — Dashboard

### 11.1 Tujuan
Dashboard adalah ringkasan utama kondisi sistem sesuai role. Dashboard harus menjawab kondisi penting secara cepat.

### 11.2 Dashboard Superadmin
Harus menampilkan:
- Total aktivitas hari ini
- Total kasus aktif
- Total kasus overdue
- Total task pending
- Total pengumuman aktif
- PT dengan issue terbanyak
- Aktivitas terbaru
- Kasus terbaru
- Komentar terbaru
- Notifikasi penting
- Users aktif hari ini
- Cases updated today
- Reports generated
- Pinned items

### 11.3 Dashboard Owner
Mirip dengan Superadmin untuk sisi view, tetapi tanpa edit data inti.
Harus menampilkan:
- Ringkasan grup
- Perbandingan PT
- Kasus high risk
- Cases overdue
- Aktivitas terbaru
- Tugas yang mereka assign
- Pengumuman yang mereka kirim
- Statistik siapa yang belum baca pengumuman
- Pinned items
- Quick export

### 11.4 Dashboard DU
Harus menampilkan:
- Aktivitas DU sendiri
- Semua data DK di PT yang sama
- Kasus aktif PT sendiri
- Komentar owner pada PT tersebut
- Task yang masuk
- Item yang mendekati due date
- Item yang overdue
- Pengumuman
- Pinned items
- Quick add activity
- Quick add case

### 11.5 Dashboard DK
Harus paling ringan.
Menampilkan:
- Aktivitas DK sendiri
- Kasus aktif PT sendiri
- Komentar DU
- Komentar owner
- Task yang masuk
- Pengumuman
- Due date warning
- Overdue warning
- Quick add activity
- Quick add case

### 11.6 Komponen visual yang wajib
- Summary cards
- Progress bar
- Table/list ringkas
- Badge status
- Filter by PT (untuk owner/superadmin)
- Filter by status
- Filter by risk level
- Last update indicator

## 12. Modul 2 — Aktivitas

### 12.1 Tujuan
Digunakan oleh DU dan DK untuk mencatat aktivitas penting yang perlu dimonitor.
Modul ini bukan untuk mencatat setiap aktivitas kecil. Hanya aktivitas penting yang relevan bagi monitoring owner.

### 12.2 Siapa yang bisa membuat aktivitas
- DU
- DK

### 12.3 Siapa yang bisa melihat aktivitas
- Superadmin (semua)
- Owner (semua)
- DU (PT sendiri)
- DK (PT sendiri)

### 12.4 Siapa yang bisa memberi komentar
- Superadmin
- Owner
- DU
- DK (reply dalam thread yang relevan)

### 12.5 Field aktivitas
**Field wajib inti:**
- Tanggal
- PT
- Role penginput (DU / DK)
- Kategori aktivitas
- Judul aktivitas
- Deskripsi singkat
- Hasil / perkembangan
- Status
- Priority

**Field wajib kondisional:**
- Progress % (jika ongoing)
- Target selesai (jika ada deadline)
- Next action (jika belum selesai)

**Field opsional:**
- Attachment
- Catatan tambahan
- Tag aktivitas

### 12.6 Kategori aktivitas
Contoh kategori:
- Audit cabang
- Review pengaduan
- Mediasi
- Meeting regulator
- Koordinasi internal
- Penyusunan laporan
- Evaluasi kepatuhan
- Tindakan korektif
- Monitoring kasus
- Pengawasan cabang

### 12.7 Status aktivitas
- Direncanakan
- Sedang Dikerjakan
- Menunggu Review
- Selesai
- Tertunda
- Overdue

### 12.8 Quick Add Activity
Harus ada tombol input cepat untuk aktivitas.
Field quick add:
- Tanggal
- Kategori
- Judul
- Catatan singkat
- Status

Quick add dipakai untuk mempercepat adopsi sistem.

## 13. Modul 3 — Kasus Pengaduan

### 13.1 Tujuan
Modul utama untuk mencatat, memantau, mengelola, dan melaporkan kasus pengaduan.

### 13.2 Struktur konsep
Satu kasus = satu record utama, tetapi bisa memiliki:
- banyak komentar
- banyak update progress
- banyak lampiran
- timeline
- task terkait

### 13.3 Bucket kasus
Harus ada pilihan bucket untuk mengelompokkan kasus:
- Pemeriksaan Pengaduan Baru
- Disetujui untuk Perdamaian
- Tidak Disetujui untuk Perdamaian
- Menunggu Pemeriksaan
- Proses Negosiasi / Mediasi
- Proses Regulator
- Deadlock
- Closed

### 13.4 Field identitas kasus
**Wajib inti:**
- PT
- Cabang
- Kode kasus
- Tanggal masuk
- Nama nasabah
- Nomor akun (jika ada)
- PIC utama
- Case bucket
- Case status

**Opsional penting:**
- Nama marketing
- Nama WPB
- Nama team

### 13.5 Field ringkasan kasus
**Wajib inti:**
- Inti pengaduan
- Risk level
- Priority
- Workflow stage
- Progress %

**Opsional:**
- Regulator status
- Tag kasus

### 13.6 Field temuan / kelemahan
**Wajib inti:**
- Kelemahan naratif / temuan
- Hasil pemeriksaan internal
- Root cause utama

**Opsional:**
- KYC issue
- Unauthorized action
- Misleading promise
- Registrasi bermasalah
- Transaksi bermasalah
- Supervision failure
- Pre-registration issue

### 13.7 Field negosiasi / settlement
**Kondisional, tampil jika relevan:**
- Permintaan nasabah
- Budget disetujui
- Penawaran perusahaan
- Hasil settlement
- Alasan tidak disetujui
- Posisi negosiasi
- Next negotiation step

### 13.8 Field kontrol waktu
**Wajib inti:**
- Tanggal masuk
- Target penyelesaian
- Last update date
- Progress %
- Workflow stage

**Dihitung sistem:**
- Case age
- Overdue flag
- Days remaining

### 13.9 Field tindak lanjut
- Latest action
- Next action
- Corrective action
- Preventive action
- Owner note
- DU note
- DK note

### 13.10 Attachments
Setiap kasus bisa memiliki lampiran:
- Surat pengaduan
- Screenshot
- Bukti transfer
- Surat regulator
- Memo internal
- Dokumen mediasi
- Dokumen lain

Harus ada preview untuk file yang mendukung preview.

### 13.11 Case timeline
Setiap kasus harus punya timeline sederhana:
- Case dibuat
- Pemeriksaan dimulai
- Review internal
- Negosiasi
- Settlement / deadlock
- Closed

Timeline ini tidak harus terlalu kompleks, tetapi wajib ada.

## 14. Modul 4 — Progress Tracking

### 14.1 Tujuan
Agar owner, superadmin, DU, dan DK bisa membaca posisi aktivitas dan kasus dengan cepat.

### 14.2 Komponen progress
Setiap item yang ongoing bisa memiliki:
- Progress %
- Workflow stage
- Deadline
- Aging
- Completion rate

### 14.3 Status visual
- Hijau = On Track
- Kuning = Warning
- Merah = Overdue
- Abu gelap = Closed

### 14.4 Stage default
Sediakan stage default untuk kasus:
- Open
- Pemeriksaan Internal
- Review
- Negosiasi
- Proses Regulator
- Settlement / Deadlock
- Closed

Sediakan stage default untuk aktivitas:
- Direncanakan
- Sedang Dikerjakan
- Menunggu Review
- Selesai
- Tertunda

### 14.5 Logika progress
Gunakan gabungan:
- stage default percent
- manual adjustment

Contoh:
- Pemeriksaan Internal = default 30%
- Negosiasi = default 70%
- Closed = 100%

User boleh menyesuaikan sedikit persen jika perlu.

### 14.6 Indikator tambahan
- Last updated x days ago
- Expected progress vs actual progress (opsional sederhana)
- Completion rate per PT
- Completion rate grup

## 15. Modul 5 — Tugas

### 15.1 Tujuan
Owner dan Superadmin dapat memberikan tugas yang jelas kepada DU atau DK.

### 15.2 Siapa yang bisa membuat task
- Superadmin
- Owner

### 15.3 Siapa yang bisa menerima task
- DU
- DK
- Jika diperlukan, superadmin juga bisa assign ke superadmin lain

### 15.4 Field task
- Judul tugas
- Deskripsi tugas
- Ditugaskan kepada
- PT terkait
- Tanggal dibuat
- Deadline
- Priority
- Status
- Progress %
- Catatan
- Lampiran (opsional)

### 15.5 Status task
- Baru
- Sedang Dikerjakan
- Menunggu Review
- Selesai
- Terlambat

### 15.6 Relasi task
Task bisa:
- berdiri sendiri
- terkait ke aktivitas
- terkait ke kasus

## 16. Modul 6 — Pengumuman

### 16.1 Tujuan
Owner dan Superadmin bisa menyampaikan pengumuman, instruksi, atau perhatian penting.

### 16.2 Jenis pengumuman
- Pengumuman untuk semua user
- Pengumuman untuk semua DU
- Pengumuman untuk semua DK
- Pengumuman untuk PT tertentu
- Pengumuman untuk user tertentu jika perlu

### 16.3 Field pengumuman
- Judul
- Isi pengumuman
- Prioritas
- Target penerima
- Tanggal mulai tampil
- Tanggal berakhir (opsional)
- Attachment (opsional)

### 16.4 Fitur penting
- Read receipt (siapa sudah baca, siapa belum)
- Notifikasi untuk announcement penting
- Announcement pinned jika prioritas tinggi

## 17. Modul 7 — Pesan

### 17.1 Tujuan
Komunikasi privat tanpa mencampurkan data inti dengan chat.

### 17.2 Jenis pesan
- Private message
- Group message sederhana jika diperlukan

### 17.3 Catatan
Pesan bukan sumber data resmi. Data resmi tetap berasal dari aktivitas, kasus, task, dan report.

## 18. Modul 8 — Komentar dan Thread Diskusi

### 18.1 Tujuan
Diskusi kontekstual pada aktivitas, kasus, atau task.

### 18.2 Lokasi thread
Thread tersedia di:
- Aktivitas
- Kasus
- Tugas

### 18.3 Aturan hierarki
- Owner bisa comment ke semua
- DU bisa comment ke DK pada PT yang sama
- DK bisa membalas dalam thread
- Komentar tidak mengubah data inti
- Komentar harus tercatat dalam audit trail

### 18.4 Fitur tambahan
- Mention user
- Timestamp
- Read indicator sederhana
- Lampiran opsional jika perlu

## 19. Modul 9 — Laporan

### 19.1 Tujuan
Membuat laporan otomatis tanpa membuat DU/DK menulis ulang narasi setiap kali.

### 19.2 Jenis periode laporan
- Mingguan
- Bulanan
- Kuartalan
- Tahunan
- Trend 3 tahun

### 19.3 Jenis format export
- PDF
- Excel
- Word

### 19.4 Dua format laporan
#### A. Format operasional
Mirip gaya laporan DK saat ini.
Berisi:
- daftar kasus
- status
- temuan
- tindak lanjut
- list per bucket

#### B. Format executive summary
Ringkas untuk boss.
Berisi:
- Total aktivitas
- Total pengaduan
- Total selesai
- Total ongoing
- Total deadlock
- Total overdue
- PT dengan kasus terbanyak
- Root cause dominan
- Item high risk

### 19.5 Report weekly
Isi:
- Aktivitas minggu ini
- Kasus baru minggu ini
- Kasus selesai minggu ini
- Kasus aktif
- Task overdue
- Isu penting

### 19.6 Report monthly
Isi:
- Total pengaduan bulan ini
- Kasus selesai
- Kasus ongoing
- Kasus deadlock
- Root cause dominan
- Cabang / PT dengan issue dominan
- High risk summary

### 19.7 Report quarterly
Isi:
- Trend per 3 bulan
- Evaluasi progress
- Pola kelemahan
- Tindakan perbaikan

### 19.8 Report yearly
Isi:
- Rekap 12 bulan
- Tren tahunan
- Evaluasi pengawasan
- Ringkasan governance

### 19.9 Report 3 tahun
Isi:
- Tren jangka panjang
- Perbandingan periode
- Root cause pattern
- Improvement trend

### 19.10 Filter laporan
Sediakan filter:
- Per PT
- Semua PT
- Per role penginput
- Per status
- Per risk level
- Per bucket kasus
- Per tanggal

## 20. Modul 10 — Notifikasi dan Alert

### 20.1 Tujuan
Memberi tahu user jika ada hal penting tanpa membuat sistem terasa cerewet.

### 20.2 Jenis notifikasi
- Due date reminder
- Overdue warning
- Idle warning (lama tidak disentuh)
- Task assignment
- Komentar baru
- Balasan thread
- Pengumuman baru
- Pengumuman prioritas tinggi
- Kasus high risk
- Regulator process alert

### 20.3 Bentuk notifikasi
- In-app notification
- Bell icon di header
- Halaman notifikasi
- Browser notification / push notification untuk PWA

### 20.4 Aturan prioritas
- Low
- Medium
- High
- Critical

### 20.5 Role-based notification
Superadmin, Owner, DU, DK menerima notifikasi sesuai role dan PT.

### 20.6 Idle detection
Jika aktivitas, kasus, atau task tidak diupdate dalam periode tertentu, sistem membuat alert.

## 21. Modul 11 — Pencarian

### 21.1 Tujuan
Memudahkan user mencari data tanpa membuka banyak menu.

### 21.2 Pencarian global
User bisa mencari:
- Nama nasabah
- Nomor akun
- Kode kasus
- Cabang
- Kata kunci aktivitas
- Judul task
- Kata kunci komentar

### 21.3 Filter cepat
Harus ada filter cepat untuk:
- PT
- Status
- Risk level
- Bucket kasus
- Due date
- Overdue
- Assigned to

## 22. Modul 12 — Import Excel

### 22.1 Tujuan
Mengakomodasi file laporan yang sudah berbentuk Excel.

### 22.2 Fitur yang wajib
- Upload file Excel / CSV
- Preview file
- Mapping kolom
- Validation
- Simpan template mapping
- Import history

### 22.3 Catatan penting
Import versi awal bersifat semi-manual, bukan AI full auto. Ini lebih aman.

### 22.4 Prinsip mapping
Walau nama kolom berbeda, sistem harus bisa memetakan ke struktur master.

## 23. Modul 13 — Pengaturan

### 23.1 User setting
- Ganti password
- Atur preferensi notifikasi
- Pilih secret question
- Update secret answer

### 23.2 Superadmin setting
- Manage kategori master
- Manage company
- Manage role
- Manage import template
- Manage report template sederhana

## 24. Data Master dan Tabel Utama
Tabel inti yang direkomendasikan:
- companies
- users
- roles
- activities
- activity_comments
- cases
- case_updates
- case_comments
- tasks
- task_comments
- announcements
- messages
- notifications
- attachments
- import_templates
- import_logs
- report_exports
- audit_logs
- master_categories
- root_cause_tags

## 25. Penjelasan Fungsi Tabel Utama

### companies
Menyimpan data PT.

### users
Menyimpan data user, username, role, company_id, secret question, status akun.

### activities
Menyimpan aktivitas penting DU/DK.

### cases
Menyimpan record utama kasus/pengaduan.

### tasks
Menyimpan tugas yang dibuat owner atau superadmin.

### announcements
Menyimpan pengumuman dan target audiensnya.

### messages
Menyimpan pesan privat.

### notifications
Menyimpan semua notifikasi.

### attachments
Menyimpan metadata lampiran.

### audit_logs
Menyimpan histori perubahan penting.

## 26. Audit Trail dan Soft Delete

### Audit trail wajib
Setiap perubahan penting harus tercatat:
- siapa yang membuat
- siapa yang mengubah
- kapan
- apa yang berubah

### Soft delete wajib
Data tidak boleh hilang permanen dengan mudah.
Gunakan archive / soft delete.

## 27. Hal-Hal Kecil yang Wajib Ada
- Quick Add Activity
- Quick Add Case
- Pin / Bookmark item
- Last update indicator
- Attachment preview
- Read receipt untuk pengumuman
- Export cepat dari dashboard
- Pinned items di dashboard
- Daily reminder / daily summary ringan

## 28. Hal yang Tidak Perlu Dibangun di Versi 1
Jangan bangun dulu:
- AI analysis otomatis
- OCR dokumen
- Integrasi email
- Integrasi WhatsApp
- Mobile native app
- Cabang input langsung
- Chatbot internal
- Workflow approval bertingkat yang kompleks
- Machine learning scoring

## 29. Prioritas Build Versi 1

### Fase 1
- Auth
- Role access
- Companies
- Users
- Dashboard dasar
- Activities
- Cases
- Tasks
- Comments
- Announcements
- Notifications in-app

### Fase 2
- Reports
- Export PDF/Excel/Word
- Import Excel
- Search
- Filter cepat
- Pinned items
- Attachment preview

### Fase 3
- Push/browser notifications
- Report template improvement
- Read receipt enhancement
- Idle alert enhancement

## 30. Catatan Implementasi untuk Replit Agent
Bangun aplikasi ini **persis sesuai dokumen ini**.  
Jangan menambahkan fitur yang tidak diminta.  
Jangan mengubah role hierarchy.  
Jangan mengubah logika bahwa:
- input aktif hanya DK dan DU
- owner hanya view + comment + announcement + task, bukan editor inti
- superadmin adalah satu-satunya editor utama lintas sistem
- sistem menggunakan Bahasa Indonesia
- aplikasi harus terasa sederhana dan mudah dipakai

## 31. Instruksi Output Awal untuk Replit Agent
Saat mulai membangun, prioritaskan hasil berikut:
1. Struktur database dan role access
2. Halaman login
3. Dashboard dasar per role
4. CRUD aktivitas
5. CRUD kasus
6. Thread komentar
7. Task assignment
8. Pengumuman
9. Notifikasi in-app
10. Report basic export

Setelah itu baru lanjut ke import Excel, push notification, dan polishing.

## 32. Penutup
Aplikasi ini harus menjadi **SG Control Center**, yaitu pusat kendali internal yang ringan, jelas, mudah dipakai, dan kuat untuk membaca kondisi organisasi. Fokus utama adalah kontrol, monitoring, progress, komunikasi, dan pelaporan — bukan fitur mewah yang membuat aplikasi berat.
