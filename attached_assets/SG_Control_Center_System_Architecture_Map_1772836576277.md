# SG CONTROL CENTER — SYSTEM ARCHITECTURE MAP
Versi Pendamping untuk Replit Agent (Rere)

## 1. Tujuan Dokumen
Dokumen ini adalah peta arsitektur sistem agar Replit Agent memahami hubungan antar modul, alur user, dan arah pembangunan aplikasi secara menyeluruh.

Dokumen ini bukan pengganti spesifikasi utama.
Dokumen ini berfungsi sebagai panduan visual/logika agar struktur project, relasi database, dan alur modul tidak salah dipahami.

Gunakan dokumen ini bersama:
1. SG_Control_Center_Complete_Build_Spec.md
2. replit_agent_prompt_sgcc.txt

## 2. Posisi Aplikasi
SG Control Center adalah pusat kendali internal grup untuk 5 PT SG.

Fungsi utama:
- Monitoring aktivitas penting level direksi
- Monitoring kasus/pengaduan
- Monitoring progress dan deadline
- Pemberian komentar, task, dan pengumuman
- Pelaporan otomatis
- Notifikasi dan alert

Aplikasi ini bukan:
- CRM marketing
- ERP umum
- aplikasi chat utama
- sistem input operasional cabang

## 3. Struktur User dan Hirarki

### 3.1 Role utama
1. Superadmin (2 orang)
2. Owner (5 orang)
3. Direktur Utama / DU (1 per PT)
4. Direktur Kepatuhan / DK (1 per PT)

### 3.2 Relasi hirarki
- Superadmin = editor inti dan pengendali sistem
- Owner = monitor seluruh grup, comment, task, announcement
- DU = atasan langsung DK pada PT yang sama
- DK = penginput utama aktivitas kepatuhan dan kasus

### 3.3 Arah relasi kerja
- DK menginput aktivitas dan kasus
- DU menginput aktivitas dan kasus, sekaligus mereview DK
- Owner memonitor semua PT dan memberi arahan
- Superadmin mengelola sistem dan data inti

## 4. Arsitektur Besar Sistem

### 4.1 Konsep utama
Sistem menggunakan:
1 database pusat + multi-company architecture

Artinya:
- satu aplikasi
- satu backend
- satu database
- semua data diberi company_id
- akses dibatasi berdasarkan role dan PT

### 4.2 Alur besar
Input data → simpan ke database → diproses di dashboard → bisa dikomentari atau diberi task → muncul di laporan → memicu notifikasi

## 5. Peta Modul Utama

### Modul 1 — Dashboard
Fungsi:
- pusat ringkasan kondisi sistem
- tampilan berbeda per role
- tempat membaca status sistem secara cepat

Dipakai oleh:
- Superadmin
- Owner
- DU
- DK

Input berasal dari:
- Aktivitas
- Kasus
- Tugas
- Pengumuman
- Notifikasi

Output ke user:
- ringkasan kondisi
- overdue alert
- progress status
- pinned items
- recent updates

### Modul 2 — Aktivitas
Fungsi:
- mencatat aktivitas penting DU dan DK

Dipakai oleh:
- DU
- DK

Dilihat oleh:
- Superadmin
- Owner
- DU PT terkait
- DK PT terkait

Terhubung dengan:
- komentar
- task
- notifikasi
- laporan
- dashboard

### Modul 3 — Kasus Pengaduan
Fungsi:
- mencatat dan memantau pengaduan/kasus

Dipakai oleh:
- DU
- DK

Dilihat oleh:
- Superadmin
- Owner
- DU PT terkait
- DK PT terkait

Terhubung dengan:
- update progress
- komentar
- task
- lampiran
- timeline
- report
- notifikasi
- dashboard

### Modul 4 — Tugas
Fungsi:
- memberi tugas resmi dari Owner/Superadmin ke DU/DK

Pembuat:
- Superadmin
- Owner

Penerima:
- DU
- DK

Terhubung dengan:
- dashboard
- notifikasi
- komentar
- laporan

### Modul 5 — Pengumuman
Fungsi:
- menyampaikan instruksi/pengumuman resmi

Pembuat:
- Superadmin
- Owner

Penerima:
- semua user
- role tertentu
- PT tertentu
- user tertentu

Terhubung dengan:
- notifikasi
- read receipt
- dashboard

### Modul 6 — Pesan
Fungsi:
- komunikasi privat

Pembuat/Penerima:
- Superadmin
- Owner
- DU
- DK

Catatan:
- pesan bukan data inti resmi
- pesan tidak menggantikan aktivitas, kasus, atau task

### Modul 7 — Komentar / Thread Diskusi
Fungsi:
- diskusi kontekstual pada aktivitas, kasus, atau task

Terhubung ke:
- Aktivitas
- Kasus
- Tugas

Aturan:
- Owner bisa comment ke semua
- DU bisa comment ke DK PT yang sama
- DK bisa reply
- komentar tidak boleh mengubah data inti

### Modul 8 — Laporan
Fungsi:
- menghasilkan report otomatis

Sumber data:
- aktivitas
- kasus
- tugas
- status progress
- overdue
- risk level
- bucket kasus
- root cause

Output:
- PDF
- Excel
- Word

Periode:
- mingguan
- bulanan
- kuartalan
- tahunan
- 3 tahun

### Modul 9 — Notifikasi
Fungsi:
- memberitahu user tentang hal penting

Sumber trigger:
- task baru
- due date
- overdue
- komentar baru
- pengumuman
- idle warning
- update kasus high risk

Bentuk:
- in-app notification
- bell icon
- notification center
- push/browser notification

### Modul 10 — Import Excel
Fungsi:
- menerima data dari file Excel/CSV

Alur:
upload → preview → mapping kolom → validasi → simpan → masuk ke database → tampil di dashboard/report

Terhubung dengan:
- template import
- import logs
- validasi data

### Modul 11 — Pengaturan
Fungsi:
- setting user
- change password
- secret question
- notification preferences
- master kategori
- company management
- role management
- import template management

## 6. Alur User Per Role

### 6.1 Alur Superadmin
Login → Dashboard → kelola data inti → monitor semua PT → koreksi data bila perlu → generate report → kelola user/PT/template → lihat log sistem

### 6.2 Alur Owner
Login → Dashboard grup → lihat kondisi semua PT → comment pada kasus/aktivitas → assign task → kirim announcement → export laporan → monitor read receipt dan overdue

### 6.3 Alur DU
Login → Dashboard PT → input aktivitas → input/update kasus → review data DK → comment → update progress → baca task/pengumuman → pantau overdue PT

### 6.4 Alur DK
Login → Dashboard PT → input aktivitas → input/update kasus → update progress → jawab komentar DU/Owner → baca task/pengumuman → pantau due date

## 7. Alur Data Utama

### 7.1 Aktivitas
DU/DK membuat aktivitas → aktivitas tersimpan → bisa diberi komentar → bisa diberi task → muncul di dashboard → masuk laporan → memicu notifikasi bila overdue/idle

### 7.2 Kasus
DU/DK membuat kasus → isi ringkasan dan status → tambah update progress → tambah komentar/lampiran → muncul di dashboard → masuk laporan → memicu notifikasi bila high risk / overdue / idle

### 7.3 Tugas
Owner/Superadmin membuat tugas → tugas masuk ke penerima → penerima update progress → owner melihat status → tugas masuk laporan dan notifikasi

### 7.4 Pengumuman
Owner/Superadmin membuat pengumuman → sistem kirim notifikasi ke target → user membaca → status read receipt tercatat → pengumuman tampil di dashboard

## 8. Relasi Antar Modul

Dashboard mengambil data dari:
- Aktivitas
- Kasus
- Tugas
- Pengumuman
- Notifikasi

Aktivitas terhubung ke:
- Komentar
- Tugas
- Lampiran
- Dashboard
- Laporan
- Notifikasi

Kasus terhubung ke:
- Update progres
- Komentar
- Tugas
- Lampiran
- Timeline
- Laporan
- Notifikasi

Tugas terhubung ke:
- Kasus (opsional)
- Aktivitas (opsional)
- Komentar
- Dashboard
- Laporan
- Notifikasi

Pengumuman terhubung ke:
- Notifikasi
- Read receipt
- Dashboard

Pesan berdiri sendiri tetapi tetap muncul dalam notifikasi

Import Excel mengisi:
- Aktivitas atau Kasus tergantung template mapping

## 9. Peta Database Sederhana

### Tabel master
- companies
- roles
- users
- master_categories
- root_cause_tags

### Tabel operasional
- activities
- cases
- tasks
- announcements
- messages
- notifications

### Tabel pendukung
- activity_comments
- case_updates
- case_comments
- task_comments
- attachments
- import_templates
- import_logs
- report_exports
- audit_logs

## 10. Relasi Database Sederhana

companies terhubung ke:
- users
- activities
- cases
- tasks
- announcements (opsional)
- notifications

users terhubung ke:
- activities
- cases
- tasks
- comments
- messages
- notifications
- report_exports
- audit_logs

activities terhubung ke:
- activity_comments
- attachments
- tasks (opsional)
- notifications

cases terhubung ke:
- case_updates
- case_comments
- attachments
- tasks
- notifications
- root_cause_tags

tasks terhubung ke:
- task_comments
- users
- cases (opsional)
- activities (opsional)

announcements terhubung ke:
- notifications
- read receipt / tracking baca

## 11. Peta Workflow Kasus

Tahap umum kasus:
1. Kasus dibuat
2. Pemeriksaan internal
3. Review
4. Negosiasi / mediasi
5. Proses regulator (jika ada)
6. Settlement / tidak disetujui / deadlock
7. Closed

Komponen kontrol:
- progress %
- workflow stage
- target date
- overdue flag
- last update
- risk level
- owner note
- DU note
- DK note

## 12. Peta Workflow Aktivitas

Tahap umum aktivitas:
1. Direncanakan
2. Sedang dikerjakan
3. Menunggu review
4. Selesai
5. Tertunda / overdue

Komponen kontrol:
- progress %
- target date
- priority
- status
- next action
- last update

## 13. Peta Workflow Laporan

Sumber laporan:
- aktivitas
- kasus
- tugas
- komentar penting
- overdue
- root cause
- risk level

Report periodik:
- weekly
- monthly
- quarterly
- yearly
- 3-year trend

Output report:
- format operasional
- format executive summary

## 14. Peta Notifikasi

Trigger notifikasi:
- task baru
- due date mendekat
- overdue
- komentar baru
- balasan thread
- pengumuman
- high risk case
- regulator process
- idle item

Jalur notifikasi:
trigger → notifications table → bell icon / notification page → push/browser notification (jika aktif)

## 15. Prinsip Build untuk Replit Agent

Rere harus memahami bahwa:
- sistem ini harus ringan
- jangan over-engineer
- jangan buat microservice
- jangan buat database terpisah per PT
- jangan tambahkan fitur di luar blueprint
- jangan ubah hierarchy role
- jangan ubah bahasa UI
- jangan ubah warna utama

## 16. Output yang Diharapkan dari Replit Agent

Saat membaca peta arsitektur ini, Replit Agent harus bisa langsung memahami:
1. siapa user utama
2. data mengalir dari mana ke mana
3. modul apa yang saling terhubung
4. tabel apa yang harus ada
5. dashboard harus mengambil data dari modul mana
6. laporan dibangun dari kumpulan data apa
7. notifikasi dipicu oleh event apa

## 17. Ringkasan Super Singkat
SG Control Center adalah satu sistem pusat untuk 5 PT, dengan 1 database multi-company, input aktif hanya oleh DU dan DK, monitoring oleh Owner, kontrol teknis oleh Superadmin, serta modul inti berupa Dashboard, Aktivitas, Kasus, Tugas, Pengumuman, Pesan, Laporan, Notifikasi, dan Import Excel.

Dokumen ini dipakai agar arsitektur aplikasi dipahami secara utuh sebelum coding dimulai.
