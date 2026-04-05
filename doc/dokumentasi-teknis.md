# Dokumentasi Teknis — SG Control Center (SGCC)

**Versi:** 1.0
**Tanggal:** April 2026
**Bahasa Aplikasi:** Bahasa Indonesia
**Tema:** Navy Blue

---

## Daftar Isi

1. [Overview Sistem](#1-overview-sistem)
2. [Stack Teknologi](#2-stack-teknologi)
3. [Arsitektur Aplikasi](#3-arsitektur-aplikasi)
4. [Struktur Folder](#4-struktur-folder)
5. [Database Schema](#5-database-schema)
6. [Sistem Autentikasi & Session](#6-sistem-autentikasi--session)
7. [Role-Based Access Control (RBAC)](#7-role-based-access-control-rbac)
8. [API Endpoints](#8-api-endpoints)
9. [Sistem Notifikasi](#9-sistem-notifikasi)
10. [Reminder Otomatis](#10-reminder-otomatis)
11. [Penilaian KPI](#11-penilaian-kpi)
12. [PWA (Progressive Web App)](#12-pwa-progressive-web-app)
13. [Web Push Notifications](#13-web-push-notifications)
14. [Security](#14-security)
15. [Export & Download](#15-export--download)
16. [Error Handling](#16-error-handling)

---

## 1. Overview Sistem

**SG Control Center (SGCC)** adalah platform governance dan compliance monitoring internal untuk Grup SG. Sistem ini dirancang untuk memantau dan mengelola aktivitas, pengaduan, tugas, komunikasi, dan penilaian kinerja direksi di 5 perusahaan pialang berjangka di bawah naungan Grup SG.

### Perusahaan yang Dikelola

| No | Nama Perusahaan | Kode | ID |
|----|----------------|------|-----|
| 1 | PT Solid Gold Berjangka | SGB | 6 |
| 2 | PT Rifan Financindo Berjangka | RFB | 7 |
| 3 | PT Best Profit Futures | BPF | 8 |
| 4 | PT Kontak Perkasa Futures | KPF | 9 |
| 5 | PT Equityworld Futures | EWF | 10 |

### Modul Utama

1. **Dashboard** — Ringkasan statistik per role
2. **Aktivitas** — CRUD aktivitas penting DU/DK
3. **Kasus Pengaduan** — CRUD kasus, timeline, workflow stage, pertemuan
4. **Tugas** — Assignment dari Owner/Superadmin ke DU/DK
5. **Pengumuman** — Broadcast dari Owner/Superadmin
6. **Pesan** — Komunikasi privat antar pengguna
7. **Notifikasi** — In-app + push notifications
8. **Komentar** — Thread diskusi pada aktivitas/kasus/tugas
9. **Manajemen User** — CRUD user (superadmin only)
10. **Manajemen PT** — Detail perusahaan, cabang, rekap
11. **Penilaian KPI** — Penilaian kinerja DU/DK

---

## 2. Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Routing (Frontend) | Wouter v3 |
| State Management | TanStack Query v5 |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validasi | Zod + drizzle-zod |
| Autentikasi | Passport.js (LocalStrategy) |
| Session | express-session + connect-pg-simple |
| Hashing | bcrypt (10 rounds) |
| Push Notifications | web-push (VAPID) |
| Export PDF | jspdf + jspdf-autotable |
| Export Excel | xlsx |
| Export Word | docx + file-saver |
| Icons | lucide-react |
| Charts | SVG Radar Chart (custom) |

---

## 3. Arsitektur Aplikasi

### Arsitektur Multi-Company

- **Satu database** untuk semua perusahaan
- Setiap tabel data utama (activities, cases, tasks) memiliki kolom `company_id`
- Isolasi data berdasarkan `company_id` dan role user
- Superadmin & Owner dapat mengakses data semua perusahaan
- DU/DK hanya dapat mengakses data perusahaan sendiri

### Pola Komunikasi

```
[Browser/PWA] ←→ [Express Server] ←→ [PostgreSQL]
                      ↕
                [Push Service (VAPID)]
```

- Frontend dan backend berjalan pada port yang sama (Vite dev server di-proxy melalui Express)
- API routes berada di prefix `/api/`
- Session disimpan di PostgreSQL (connect-pg-simple)
- Frontend menggunakan TanStack Query untuk caching dan state management

### Seed Data

- Auto-seed pada startup jika database kosong
- Migrasi schema menggunakan raw SQL di `runMigrations()` (bukan drizzle push)
- Demo data mencakup: perusahaan, cabang, users, master categories

---

## 4. Struktur Folder

```
/
├── shared/
│   └── schema.ts              # Database schema + types (Drizzle + Zod)
├── server/
│   ├── index.ts               # Express server entry point
│   ├── db.ts                  # Database connection (PostgreSQL pool)
│   ├── auth.ts                # Passport autentikasi + session setup
│   ├── routes.ts              # Semua API routes
│   ├── storage.ts             # Storage layer (CRUD operations)
│   ├── seed.ts                # Demo data seeder + migrasi
│   ├── reminders.ts           # Automated reminder scheduler
│   └── vite.ts                # Vite dev server integration
├── client/
│   ├── index.html             # HTML entry point + splash screen
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   ├── sw.js              # Service Worker
│   │   ├── icon-192.png       # PWA icon 192x192
│   │   └── icon-512.png       # PWA icon 512x512
│   └── src/
│       ├── App.tsx            # Root app + routing
│       ├── main.tsx           # React entry
│       ├── index.css          # Global styles + theme CSS variables
│       ├── lib/
│       │   ├── auth.tsx       # Auth context + hooks
│       │   ├── queryClient.ts # TanStack Query setup
│       │   └── download.ts    # Export utilities (PDF/Excel/Word)
│       ├── hooks/
│       │   ├── use-toast.ts   # Toast hook
│       │   ├── use-page-title.ts    # Dynamic page title
│       │   └── use-push-notifications.ts # Push notification hook
│       ├── components/
│       │   ├── app-sidebar.tsx      # Sidebar navigasi
│       │   ├── download-menu.tsx    # Dropdown export menu
│       │   ├── data-pagination.tsx  # Reusable pagination
│       │   ├── status-badges.tsx    # StatusBadge, RiskBadge
│       │   ├── error-boundary.tsx   # ErrorBoundary component
│       │   ├── query-error.tsx      # QueryError component
│       │   └── ui/                  # shadcn/ui components
│       └── pages/
│           ├── login.tsx            # Halaman login
│           ├── dashboard.tsx        # Dashboard per role
│           ├── aktivitas.tsx        # Daftar aktivitas
│           ├── aktivitas-detail.tsx # Detail aktivitas + komentar
│           ├── kasus.tsx            # Daftar kasus pengaduan
│           ├── kasus-detail.tsx     # Detail kasus + timeline + pertemuan
│           ├── tugas.tsx            # Daftar tugas
│           ├── pengumuman.tsx       # Pengumuman
│           ├── pesan.tsx            # Pesan privat
│           ├── notifikasi.tsx       # Notifikasi in-app
│           ├── pengaturan.tsx       # Ganti password + push settings
│           ├── update-profil.tsx    # Update profil pengguna
│           ├── users.tsx            # Manajemen user (superadmin)
│           ├── companies.tsx        # Daftar perusahaan
│           ├── company-detail.tsx   # Detail PT
│           ├── kpi.tsx              # Penilaian KPI
│           └── not-found.tsx        # 404 page
├── drizzle.config.ts          # Drizzle ORM config
├── vite.config.ts             # Vite config
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

---

## 5. Database Schema

### 5.1 Tabel `companies` — Perusahaan

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID perusahaan |
| name | text | Nama lengkap PT |
| code | text (unique) | Kode singkat (SGB, RFB, dll.) |
| address | text (nullable) | Alamat |
| phone | text (nullable) | Telepon |
| email | text (nullable) | Email |
| director_name | text (nullable) | Nama direktur |
| founded_date | text (nullable) | Tanggal berdiri |
| license_number | text (nullable) | Nomor izin |
| is_active | boolean | Status aktif (default: true) |

### 5.2 Tabel `branches` — Cabang

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID cabang |
| company_id | integer (FK) | ID perusahaan |
| name | text | Nama cabang |
| address | text (nullable) | Alamat cabang |
| head_name | text (nullable) | Nama kepala cabang |
| wpb_count | integer | Jumlah WPB (default: 0) |
| is_active | boolean | Status aktif (default: true) |

**Index:** `idx_branches_company_id` pada `company_id`

### 5.3 Tabel `users` — Pengguna

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID user |
| username | text (unique) | Username login |
| password | text | Password (bcrypt hash) |
| full_name | text | Nama lengkap |
| role | text | Role: superadmin, owner, du, dk |
| company_id | integer (nullable) | ID perusahaan (null untuk superadmin/owner) |
| phone | text (nullable) | Nomor telepon |
| address | text (nullable) | Alamat |
| birth_date | text (nullable) | Tanggal lahir |
| branch_count | integer (nullable) | Jumlah cabang yang dikelola |
| position | text (nullable) | Jabatan |
| avatar_url | text (nullable) | URL foto profil |
| profile_completed | boolean | Profil sudah lengkap (default: false) |
| secret_question | text (nullable) | Pertanyaan rahasia (reset password) |
| secret_answer | text (nullable) | Jawaban rahasia |
| is_active | boolean | Status aktif (default: true) |
| login_attempts | integer | Jumlah percobaan login gagal (default: 0) |
| locked_until | timestamp (nullable) | Waktu kunci akun berakhir |
| last_login | timestamp (nullable) | Waktu login terakhir |
| created_at | timestamp | Waktu pembuatan akun |

**Index:** `idx_users_company_id`, `idx_users_role`

### 5.4 Tabel `master_categories` — Kategori Master

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID kategori |
| name | text | Nama kategori |
| type | text | Tipe: activity, case |
| is_active | boolean | Status aktif (default: true) |

### 5.5 Tabel `activities` — Aktivitas

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID aktivitas |
| company_id | integer (FK) | ID perusahaan |
| created_by | integer (FK) | ID pembuat |
| date | date | Tanggal aktivitas |
| category_id | integer (nullable) | ID kategori |
| title | text | Judul aktivitas |
| description | text (nullable) | Deskripsi |
| result | text (nullable) | Hasil |
| status | text | Status: Direncanakan, Berjalan, Selesai, Ditunda, Dibatalkan |
| priority | text | Prioritas: Low, Medium, High (default: Medium) |
| progress | integer | Progress 0-100 (default: 0) |
| target_date | date (nullable) | Tanggal target |
| next_action | text (nullable) | Tindakan selanjutnya |
| notes | text (nullable) | Catatan |
| is_archived | boolean | Soft-delete flag (default: false) |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu terakhir diperbarui |

**Index:** `idx_activities_company_id`, `idx_activities_created_by`, `idx_activities_archived_company`

### 5.6 Tabel `cases` — Kasus Pengaduan

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID kasus |
| company_id | integer (FK) | ID perusahaan |
| created_by | integer (FK) | ID pembuat |
| case_code | text (unique) | Kode kasus (auto-generate) |
| branch | text (nullable) | Nama cabang |
| date_received | date | Tanggal diterima |
| customer_name | text | Nama nasabah |
| account_number | text (nullable) | Nomor akun |
| pic_main | text (nullable) | PIC utama |
| bucket | text | Bucket/tahap pemeriksaan |
| status | text | Status: Open, In Progress, Closed |
| summary | text | Ringkasan kasus |
| risk_level | text | Risiko: Low, Medium, High |
| priority | text | Prioritas: Low, Medium, High |
| workflow_stage | text | Stage workflow: Open, Investigation, Resolution, Closed |
| progress | integer | Progress 0-100 |
| target_date | date (nullable) | Tanggal target penyelesaian |
| findings | text (nullable) | Temuan |
| root_cause | text (nullable) | Akar masalah |
| customer_request | text (nullable) | Permintaan nasabah |
| company_offer | text (nullable) | Penawaran perusahaan |
| settlement_result | text (nullable) | Hasil penyelesaian |
| latest_action | text (nullable) | Tindakan terakhir |
| next_action | text (nullable) | Tindakan selanjutnya |
| owner_note | text (nullable) | Catatan owner |
| du_note | text (nullable) | Catatan DU |
| dk_note | text (nullable) | Catatan DK |
| wpb_name | text (nullable) | Nama WPB |
| manager_name | text (nullable) | Nama Manager |
| resolution_path | text | Jalur penyelesaian (default: Belum Ditentukan) |
| is_archived | boolean | Soft-delete flag |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu terakhir diperbarui |

**Index:** `idx_cases_company_id`, `idx_cases_created_by`, `idx_cases_archived_company`, `idx_cases_status`

**Jalur Penyelesaian:** Belum Ditentukan, Mediasi Internal, Mediasi BBJ, Sidang Bappebti, BAKTI, Pengadilan, Kepolisian

### 5.7 Tabel `case_meetings` — Pertemuan Kasus

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID pertemuan |
| case_id | integer (FK) | ID kasus |
| meeting_date | date | Tanggal pertemuan |
| meeting_type | text | Tipe pertemuan |
| participants | text (nullable) | Peserta |
| location | text (nullable) | Lokasi |
| result | text (nullable) | Hasil pertemuan |
| notes | text (nullable) | Catatan |
| created_by | integer (FK) | ID pembuat |
| created_at | timestamp | Waktu dibuat |

**Tipe Pertemuan:** Mediasi Nasabah, Musyawarah Pialang, Mediasi BBJ, Sidang Bappebti, Negosiasi Internal, Lainnya

### 5.8 Tabel `case_updates` — Update Kasus

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID update |
| case_id | integer (FK) | ID kasus |
| created_by | integer (FK) | ID pembuat |
| content | text | Konten update |
| new_stage | text (nullable) | Stage workflow baru |
| new_progress | integer (nullable) | Progress baru |
| created_at | timestamp | Waktu dibuat |

### 5.9 Tabel `tasks` — Tugas

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID tugas |
| company_id | integer (nullable, FK) | ID perusahaan |
| created_by | integer (FK) | ID pembuat |
| assigned_to | integer (FK) | ID penerima tugas |
| title | text | Judul tugas |
| description | text (nullable) | Deskripsi |
| priority | text | Prioritas: Low, Medium, High |
| status | text | Status: Baru, Dalam Proses, Selesai |
| progress | integer | Progress 0-100 |
| deadline | date (nullable) | Deadline |
| related_case_id | integer (nullable) | Terkait kasus |
| related_activity_id | integer (nullable) | Terkait aktivitas |
| notes | text (nullable) | Catatan |
| is_archived | boolean | Soft-delete flag |
| created_at | timestamp | Waktu dibuat |
| updated_at | timestamp | Waktu terakhir diperbarui |

**Index:** `idx_tasks_company_id`, `idx_tasks_assigned_to`, `idx_tasks_is_archived`

### 5.10 Tabel `announcements` — Pengumuman

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID pengumuman |
| created_by | integer (FK) | ID pembuat |
| title | text | Judul pengumuman |
| content | text | Isi pengumuman |
| priority | text | Prioritas: Normal, Penting, Urgent |
| target_type | text | Target: all, role, company, user |
| target_value | text (nullable) | Nilai target (role/company_id/user_id) |
| start_date | date | Tanggal mulai |
| end_date | date (nullable) | Tanggal berakhir |
| is_pinned | boolean | Disematkan (default: false) |
| is_archived | boolean | Soft-delete flag |
| created_at | timestamp | Waktu dibuat |

### 5.11 Tabel `announcement_reads` — Status Baca Pengumuman

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID |
| announcement_id | integer (FK) | ID pengumuman |
| user_id | integer (FK) | ID user |
| read_at | timestamp | Waktu dibaca |

**Index:** `idx_announcement_reads_announcement_user` (unique pada announcement_id + user_id)

### 5.12 Tabel `comments` — Komentar

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID komentar |
| entity_type | text | Tipe entitas: activity, case, task |
| entity_id | integer | ID entitas terkait |
| created_by | integer (FK) | ID pembuat |
| content | text | Isi komentar |
| parent_id | integer (nullable) | ID parent (reply thread) |
| created_at | timestamp | Waktu dibuat |

**Index:** `idx_comments_entity` pada (entity_type, entity_id)

### 5.13 Tabel `notifications` — Notifikasi

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID notifikasi |
| user_id | integer (FK) | ID penerima |
| type | text | Tipe notifikasi (lihat daftar di bawah) |
| title | text | Judul |
| message | text | Pesan |
| entity_type | text (nullable) | Tipe entitas terkait |
| entity_id | integer (nullable) | ID entitas terkait |
| is_read | boolean | Sudah dibaca (default: false) |
| priority | text | Prioritas: low, medium, high |
| created_at | timestamp | Waktu dibuat |

**Tipe Notifikasi:** new_activity, activity_updated, new_case, case_updated, case_high_risk, case_completed, task_updated, task_completed, task_assigned, new_comment, new_announcement, new_meeting, task_overdue, task_stale, case_stale, message_unread, daily_summary

### 5.14 Tabel `messages` — Pesan

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID pesan |
| sender_id | integer (FK) | ID pengirim |
| receiver_id | integer (FK) | ID penerima |
| subject | text (nullable) | Subjek |
| content | text | Isi pesan |
| is_read | boolean | Sudah dibaca (default: false) |
| tag | text (nullable) | Tag: perlu_arahan |
| created_at | timestamp | Waktu dibuat |

**Index:** `idx_messages_sender_id`, `idx_messages_receiver_id`

### 5.15 Tabel `audit_logs` — Log Audit

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID log |
| user_id | integer (FK) | ID pelaku |
| action | text | Aksi yang dilakukan |
| entity_type | text | Tipe entitas |
| entity_id | integer (nullable) | ID entitas |
| details | text (nullable) | Detail tambahan |
| created_at | timestamp | Waktu |

### 5.16 Tabel `kpi_assessments` — Penilaian KPI

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID penilaian |
| user_id | integer (FK) | ID user yang dinilai |
| period | text | Periode: YYYY-Q[1-4] |
| assessor_id | integer (FK) | ID penilai |
| activities_completed | integer | Aktivitas selesai |
| activities_total | integer | Total aktivitas |
| cases_completed | integer | Kasus selesai |
| cases_total | integer | Total kasus |
| tasks_completed | integer | Tugas selesai |
| tasks_total | integer | Total tugas |
| avg_progress | integer | Rata-rata progress |
| quality_score | integer | Skor penyelesaian aktivitas |
| timeliness_score | integer | Skor ketepatan waktu |
| initiative_score | integer | Skor responsivitas |
| communication_score | integer | Skor penyelesaian kasus |
| regulation_score | integer | Skor penyelesaian tugas |
| problem_solving_score | integer | Skor progress rata-rata |
| teamwork_score | integer | Skor beban kerja |
| responsibility_score | integer | Skor konsistensi |
| active_contribution_score | integer | Skor kontribusi aktif |
| total_score | integer | Skor total (0-100) |
| notes | text (nullable) | Catatan coaching |
| strengths | text (nullable) | Kekuatan |
| improvements | text (nullable) | Area perbaikan |
| created_at | timestamp | Waktu penilaian |

### 5.17 Tabel `read_receipts` — Tanda Baca

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID |
| entity_type | text | Tipe entitas |
| entity_id | integer | ID entitas |
| user_id | integer (FK) | ID user |
| read_at | timestamp | Waktu dibaca |

**Index:** `idx_read_receipts_entity_user` (unique), `idx_read_receipts_user`

### 5.18 Tabel `push_subscriptions` — Langganan Push

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer (PK, auto) | ID |
| user_id | integer (FK) | ID user |
| endpoint | text | Push endpoint URL |
| p256dh | text | Public key |
| auth | text | Auth secret |
| created_at | timestamp | Waktu dibuat |

---

## 6. Sistem Autentikasi & Session

### Login Flow

1. User mengirim POST `/api/auth/login` dengan `username`, `password`, dan opsional `rememberMe`
2. Passport.js LocalStrategy melakukan verifikasi:
   - Cek username ada di database
   - Cek akun aktif (`isActive = true`)
   - Cek akun tidak terkunci (`lockedUntil`)
   - Verifikasi password dengan bcrypt
3. Jika gagal: increment `loginAttempts`, kunci akun setelah 5x gagal (15 menit)
4. Jika berhasil: reset `loginAttempts`, set `lastLogin`, buat session

### Session Management

- **Storage:** PostgreSQL (connect-pg-simple, auto-create table)
- **Durasi session default:** 8 jam
- **Durasi session Remember Me:** 30 hari
- **Cookie settings:**
  - `httpOnly: true`
  - `secure: true` (production) / `false` (development)
  - `sameSite: "lax"`
- **Secret:** `SESSION_SECRET` environment variable (wajib di production)

### Keamanan Akun

- **Brute-force protection:** Akun terkunci 15 menit setelah 5x percobaan login gagal
- **Deaktivasi:** Superadmin dapat menonaktifkan akun user (isActive = false)
- **Auto-logout:** User yang dinonaktifkan otomatis di-logout saat request berikutnya

### Forgot Password

- Menggunakan pertanyaan rahasia (secret question/answer)
- Endpoint: POST `/api/auth/forgot-password`
- Pencocokan jawaban case-insensitive
- Password baru di-hash dengan bcrypt sebelum disimpan

---

## 7. Role-Based Access Control (RBAC)

### Roles

| Role | Deskripsi | Akses Data |
|------|-----------|------------|
| **superadmin** | Administrator sistem | Semua data, semua perusahaan |
| **owner** | Pemilik perusahaan | Semua data, semua perusahaan |
| **du** | Direktur Utama | Data perusahaan sendiri |
| **dk** | Direktur Kepatuhan | Data perusahaan sendiri |

### Matriks Akses per Modul

| Modul | Superadmin | Owner | DU | DK |
|-------|-----------|-------|-----|-----|
| Dashboard | Semua PT | Semua PT | PT sendiri | PT sendiri |
| Aktivitas (buat) | Ya | Tidak | Ya | Ya |
| Aktivitas (edit) | Ya (semua) | Tidak | Milik sendiri | Milik sendiri |
| Aktivitas (hapus) | Ya | Ya | Milik sendiri | Milik sendiri |
| Kasus (buat) | Tidak | Tidak | Ya | Ya |
| Kasus (edit) | Ya (semua) | Tidak | Milik sendiri | Milik sendiri |
| Kasus (hapus) | Ya | Ya | Milik sendiri | Milik sendiri |
| Tugas (buat) | Ya | Ya | Tidak | Tidak |
| Tugas (edit semua field) | Ya | Ya | Tidak | Tidak |
| Tugas (update progress) | Tidak | Tidak | Ya | Ya |
| Tugas (hapus) | Ya | Ya | Tidak | Tidak |
| Pengumuman (buat) | Ya | Ya | Tidak | Tidak |
| Pengumuman (edit) | Ya | Milik sendiri | Tidak | Tidak |
| Pengumuman (hapus) | Ya | Milik sendiri | Tidak | Tidak |
| Pesan | Semua | Semua | Semua | Semua |
| Manajemen User | Ya | Tidak | Tidak | Tidak |
| Manajemen PT | Ya | Tidak | Tidak | Tidak |
| KPI (lihat semua) | Ya | Ya | Tidak | Tidak |
| KPI (lihat sendiri) | Tidak | Tidak | Ya | Ya |
| KPI (buat penilaian) | Ya | Ya | Tidak | Tidak |

### Middleware

- `requireAuth` — Memastikan user sudah login dan akun aktif
- `requireRole(...roles)` — Memastikan user memiliki salah satu role yang diizinkan

---

## 8. API Endpoints

### 8.1 Autentikasi

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Public | Login dengan username/password |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/auth/me` | Auth | Ambil data user yang sedang login |
| POST | `/api/auth/change-password` | Auth | Ganti password |
| POST | `/api/auth/forgot-password` | Public | Reset password via pertanyaan rahasia |
| GET | `/api/auth/secret-question/:username` | Public | Ambil pertanyaan rahasia user |
| POST | `/api/auth/avatar` | Auth | Upload foto profil |
| DELETE | `/api/auth/avatar` | Auth | Hapus foto profil |

### 8.2 Dashboard

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/dashboard` | Auth | Ambil statistik ringkasan dashboard |

### 8.3 Perusahaan & Cabang

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/companies` | Auth | Daftar semua perusahaan |
| POST | `/api/companies` | Superadmin | Buat perusahaan baru |
| GET | `/api/companies/:id` | Superadmin | Detail perusahaan + cabang + statistik |
| PATCH | `/api/companies/:id` | Superadmin | Update data perusahaan |
| GET | `/api/companies/:id/branches` | Auth | Daftar cabang perusahaan |
| POST | `/api/companies/:id/branches` | Superadmin | Buat cabang baru |
| PATCH | `/api/branches/:id` | Superadmin | Update cabang |
| DELETE | `/api/branches/:id` | Superadmin | Hapus cabang |
| GET | `/api/branches/my-company` | Auth | Cabang perusahaan user saat ini |

### 8.4 User Management

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/users` | Auth | Daftar user (filter per company untuk DU/DK) |
| POST | `/api/users` | Superadmin | Buat user baru |
| PATCH | `/api/users/:id` | Auth | Update user (superadmin: semua field; self: terbatas) |
| POST | `/api/users/:id/reset-password` | Superadmin | Reset password user |
| GET | `/api/profile` | Auth | Profil user saat ini |
| PATCH | `/api/profile` | Auth | Update profil sendiri |

### 8.5 Aktivitas

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/activities` | Auth | Daftar aktivitas (pagination) |
| GET | `/api/activities/:id` | Auth | Detail aktivitas |
| POST | `/api/activities` | SA/DU/DK | Buat aktivitas baru |
| PATCH | `/api/activities/:id` | Auth | Update aktivitas (creator/superadmin) |
| DELETE | `/api/activities/:id` | Auth | Arsipkan aktivitas |

### 8.6 Kasus Pengaduan

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/cases` | Auth | Daftar kasus (pagination) |
| GET | `/api/cases/:id` | Auth | Detail kasus |
| POST | `/api/cases` | SA/DU/DK | Buat kasus baru |
| PATCH | `/api/cases/:id` | Auth | Update kasus |
| DELETE | `/api/cases/:id` | Auth | Arsipkan kasus |
| GET | `/api/cases/:id/updates` | Auth | Riwayat update kasus |
| POST | `/api/cases/:id/updates` | Auth | Tambah update kasus |
| GET | `/api/cases/:id/meetings` | Auth | Daftar pertemuan kasus |
| POST | `/api/cases/:id/meetings` | Auth | Tambah pertemuan kasus |
| DELETE | `/api/meetings/:id` | Auth | Hapus pertemuan |
| GET | `/api/uncommented-cases` | Auth | Kasus yang belum dikomentari user |

### 8.7 Tugas

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/tasks` | Auth | Daftar tugas (pagination) |
| GET | `/api/tasks/:id` | Auth | Detail tugas |
| POST | `/api/tasks` | SA/Owner | Buat tugas baru |
| PATCH | `/api/tasks/:id` | Auth | Update tugas |
| DELETE | `/api/tasks/:id` | SA/Owner | Arsipkan tugas |

### 8.8 Pengumuman

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/announcements` | Auth | Daftar pengumuman (pagination) |
| POST | `/api/announcements` | SA/Owner | Buat pengumuman |
| PATCH | `/api/announcements/:id` | SA/Owner | Update pengumuman |
| DELETE | `/api/announcements/:id` | SA/Owner | Arsipkan pengumuman |
| GET | `/api/announcements/:id/reads` | Auth | Daftar pembaca pengumuman |
| POST | `/api/announcements/:id/read` | Auth | Tandai sudah dibaca |

### 8.9 KPI

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/kpi/live` | Auth | KPI real-time semua DU/DK |
| GET | `/api/kpi/live/:userId` | Auth | KPI real-time user tertentu |
| GET | `/api/kpi` | Auth | Daftar penilaian KPI historis |
| POST | `/api/kpi` | SA/Owner | Simpan penilaian KPI |
| GET | `/api/kpi/:id` | Auth | Detail penilaian KPI |
| GET | `/api/kpi/calculate/:userId` | SA/Owner | Kalkulasi KPI untuk user & periode |

### 8.10 Notifikasi & Push

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/notifications` | Auth | Daftar notifikasi user |
| GET | `/api/notifications/unread-count` | Auth | Jumlah notifikasi belum dibaca |
| PATCH | `/api/notifications/:id/read` | Auth | Tandai notifikasi dibaca |
| POST | `/api/notifications/read-all` | Auth | Tandai semua dibaca |
| DELETE | `/api/notifications/read` | Auth | Hapus semua notifikasi yang sudah dibaca |
| DELETE | `/api/notifications/all` | Auth | Hapus semua notifikasi |
| DELETE | `/api/notifications/:id` | Auth | Hapus notifikasi tertentu |
| GET | `/api/push/vapid-key` | Public | Ambil public VAPID key |
| POST | `/api/push/subscribe` | Auth | Simpan push subscription |
| DELETE | `/api/push/subscribe` | Auth | Hapus push subscription |

### 8.11 Pesan & Komentar

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/messages` | Auth | Daftar pesan privat user |
| POST | `/api/messages` | Auth | Kirim pesan (multi-recipient) |
| PATCH | `/api/messages/:id/read` | Auth | Tandai pesan dibaca |
| GET | `/api/comments/:entityType/:entityId` | Auth | Daftar komentar entitas |
| POST | `/api/comments` | Auth | Tambah komentar |

### 8.12 Lainnya

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/categories` | Auth | Daftar kategori master |
| POST | `/api/categories` | Superadmin | Buat kategori master |
| POST | `/api/read-receipts` | Auth | Rekam tanda baca entitas |
| GET | `/api/read-receipts/:entityType/:entityId` | SA/Owner | Daftar pembaca entitas |
| GET | `/api/action-items` | Auth | Action items pending user |

---

## 9. Sistem Notifikasi

### In-App Notification

- Setiap aksi penting di sistem menghasilkan notifikasi ke pihak terkait
- Helper `notifyAdminsAndOwners()` mengirim notifikasi ke semua superadmin dan owner
- Notifikasi otomatis dihapus setelah lebih dari 7 hari (cleanup scheduler)

### Tipe Notifikasi dan Trigger

| Tipe | Trigger | Penerima |
|------|---------|----------|
| new_activity | Aktivitas baru dibuat | Admins + Owners |
| activity_updated | Aktivitas diperbarui | Admins + Owners |
| new_case | Kasus baru dibuat | Admins + Owners |
| case_updated | Kasus diperbarui | Admins + Owners |
| case_high_risk | Kasus diubah ke risiko High | Admins + Owners |
| case_completed | Kasus selesai (progress 100%) | Admins + Owners |
| task_assigned | Tugas baru diberikan | Penerima tugas |
| task_updated | Tugas diperbarui | Admins + Owners |
| task_completed | Tugas selesai | Admins + Owners |
| new_comment | Komentar baru | Peserta terkait |
| new_announcement | Pengumuman baru | Target pengguna |
| new_meeting | Pertemuan kasus baru | Admins + Owners |

### Throttling

- **Update events:** Throttle 60 menit — tidak kirim notifikasi update yang sama jika sudah ada dalam 60 menit terakhir
- **Stale reminders:** Throttle 72 jam — reminder kasus/tugas stale hanya dikirim setiap 72 jam
- **Auto-delete:** Semua notifikasi >7 hari otomatis dihapus

---

## 10. Reminder Otomatis

Sistem reminder berjalan di `server/reminders.ts`, dijalankan saat server start.

### Jadwal

- **Pertama kali:** 30 detik setelah server start
- **Interval:** Setiap 1 jam

### Jenis Reminder

| Reminder | Kondisi | Penerima | Prioritas |
|----------|---------|----------|-----------|
| Tugas Overdue | Deadline sudah lewat, status ≠ Selesai | Assignee + Admins/Owners | High |
| Kasus Stale | Tidak diupdate >7 hari, stage ≠ Closed | Creator + Admins/Owners | Medium |
| Tugas Stale | Progress <50%, dibuat >7 hari lalu, status ≠ Selesai | Assignee + Admins/Owners | Medium |
| Pesan Belum Dibaca | Belum dibaca >24 jam | Penerima pesan | Medium |
| Ringkasan Harian | Jam 8 pagi WIB, ada data overdue/stale | Semua Superadmin + Owner | Low |

### Deduplication

- Reminder tidak dikirim jika sudah ada notifikasi serupa dalam window waktu tertentu
- Default window: 24 jam
- Stale reminders window: 72 jam

### Cleanup

- Notifikasi lebih dari 7 hari secara otomatis dihapus setiap kali scheduler berjalan

---

## 11. Penilaian KPI

### Dual-Layer System

1. **KPI Live** — Skor real-time yang dihitung otomatis dari data operasional
2. **KPI Penilaian** — Snapshot per periode + catatan coaching dari assessor (owner/superadmin)

### 9 Aspek Penilaian dan Bobot

| No | Aspek | Bobot | Rumus |
|----|-------|-------|-------|
| 1 | Penyelesaian Kasus | 15% | (kasus selesai / total kasus) × 100 |
| 2 | Penyelesaian Tugas | 10% | (tugas selesai / total tugas) × 100 |
| 3 | Penyelesaian Aktivitas | 10% | (aktivitas selesai / total aktivitas) × 100 |
| 4 | Ketepatan Waktu | 15% | (item selesai tepat waktu / item dengan deadline) × 100 |
| 5 | Beban Kerja (peer-based) | 15% | min(100, (total item user / rata-rata total item semua DU/DK) × 70) |
| 6 | Progress Rata-rata | 10% | rata-rata progress dari aktivitas, kasus, dan tugas |
| 7 | Responsivitas | 10% | max(0, 100 - (item overdue / item aktif) × 100) |
| 8 | Kontribusi Aktif | 10% | min(100, (kontribusi user / median kontribusi peers) × 70) |
| 9 | Konsistensi | 5% | min(100, (total selesai / total item) × 100) |

**Total Skor** = Σ (skor aspek × bobot)

### Grade

| Grade | Rentang Skor |
|-------|-------------|
| A | ≥ 85 |
| B | ≥ 70 |
| C | ≥ 55 |
| D | < 55 |

### Detail Perhitungan

- **Ketepatan Waktu:** Menghitung item yang selesai sebelum atau tepat pada deadline/target date (tugas, aktivitas, kasus)
- **Beban Kerja:** Membandingkan total item (aktivitas + kasus + tugas) user dengan rata-rata peers (DU/DK aktif), skor 70 = setara rata-rata
- **Kontribusi Aktif:** Menghitung komentar + case updates + kontribusi pada kasus high-risk, dibandingkan dengan median peers
- **Responsivitas:** Penalti proporsional untuk setiap item overdue dari item aktif yang belum selesai

### Periode

- Format: `YYYY-Q[1-4]` (contoh: `2026-Q1`)
- Penilaian disimpan sebagai snapshot skor live pada saat penilaian

### Papan Peringkat

- DU dan DK dipisahkan dalam 2 section: "Peringkat DU" dan "Peringkat DK"
- Masing-masing menampilkan ranking 1-5

---

## 12. PWA (Progressive Web App)

### Konfigurasi

- **Manifest:** `client/public/manifest.json`
- **Service Worker:** `client/public/sw.js`
- **Strategy:** Network-first dengan offline fallback
- **Display:** Standalone
- **Icons:** 192x192 dan 512x512 (maskable)

### Splash Screen

- Inline CSS di `client/index.html`
- Navy gradient background
- Logo pulse animation
- Auto-fade setelah 1.5 detik

### Mobile Optimization

- Responsive padding (`p-3 sm:p-6`)
- Sidebar drawer pada mobile
- Viewport meta dengan `user-scalable`
- Grid responsif: `grid-cols-1 sm:grid-cols-2/3` pada form dialog
- Filter dropdown: `w-full sm:w-*` pada mobile

---

## 13. Web Push Notifications

### Arsitektur

- **Library:** web-push (Node.js)
- **Protokol:** VAPID (Voluntary Application Server Identification)
- **Environment Variables:**
  - `VAPID_PUBLIC_KEY` — Public key untuk client
  - `VAPID_PRIVATE_KEY` — Private key untuk server
  - `VAPID_EMAIL` — Email kontak

### Flow

1. Frontend request VAPID public key via GET `/api/push/vapid-key`
2. Browser meminta izin notifikasi kepada user
3. Browser mendaftarkan service worker dan mendapat push subscription
4. Subscription dikirim ke POST `/api/push/subscribe`
5. Server menyimpan subscription di tabel `push_subscriptions`
6. Saat ada event, server kirim push ke semua subscription user via `sendPushToUser()`
7. Subscription expired/invalid (410/404) otomatis di-cleanup

### Service Worker Events

- `push` — Menampilkan notifikasi
- `notificationclick` — Navigasi ke URL terkait

---

## 14. Security

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| API umum | 100 request/menit |
| Login | 10 request/menit |

Implementasi: `express-rate-limit`
Trust proxy: `app.set("trust proxy", 1)` untuk IP detection yang benar di belakang proxy.

### Validasi Input

- Semua endpoint POST/PATCH memvalidasi request body dengan Zod schema
- Error validasi mengembalikan pesan deskriptif dalam Bahasa Indonesia
- Drizzle-zod digunakan untuk membuat schema dari definisi tabel

### Session Security

- `httpOnly: true` — Cookie tidak bisa diakses via JavaScript
- `secure: true` — Hanya HTTPS di production
- `sameSite: "lax"` — Proteksi CSRF dasar
- Session disimpan di PostgreSQL, bukan memory

### Database Security

- Parameterized queries melalui Drizzle ORM (no SQL injection)
- Transaksi atomik untuk operasi multi-step
- 22 database indexes untuk performa query
- Soft-delete (isArchived) untuk mencegah kehilangan data permanen

### Password Security

- Hashing: bcrypt dengan 10 salt rounds
- Brute-force protection: 5x gagal = kunci 15 menit
- Password minimum 8 karakter (Zod validation)

### Error Handling

- Production: Error 5xx mengembalikan pesan generik
- Development: Error detail ditampilkan
- Tidak ada logging response body (keamanan)

---

## 15. Export & Download

### Format Tersedia

| Format | Library | Ekstensi |
|--------|---------|----------|
| PDF | jspdf + jspdf-autotable | .pdf |
| Excel | xlsx | .xlsx |
| Word | docx + file-saver | .docx |

### Halaman dengan Fitur Export

- Aktivitas
- Kasus Pengaduan
- Tugas

### Implementasi

- Utilitas: `client/src/lib/download.ts`
- Komponen UI: `client/src/components/download-menu.tsx`
- Data diambil dari state frontend (client-side export)

---

## 16. Error Handling

### Frontend

- **ErrorBoundary** — Komponen class yang menangkap render errors, menampilkan halaman "Terjadi Kesalahan" dengan tombol reload
- **QueryError** — Komponen reusable untuk state error dari API queries, dengan tombol "Coba Lagi"
- Digunakan di: dashboard, aktivitas, kasus, tugas, pengumuman, pesan, notifikasi

### Backend

- Try-catch pada setiap endpoint
- Pesan error dalam Bahasa Indonesia
- Format Zod error helper: `formatZodError()` mengubah Zod error menjadi pesan yang readable
- HTTP status codes yang sesuai (400, 401, 403, 404, 500)

### Pagination

- Client-side pagination (20 item per halaman) pada semua halaman list
- Backend mendukung query params `?page=1&limit=20`
- Komponen: `client/src/components/data-pagination.tsx`
- Info: "Halaman X dari Y (N data)"

---

## Appendix A: Demo Login Credentials

| Username | Role | Perusahaan | Password |
|----------|------|------------|----------|
| superadmin | Superadmin | Semua | admin123 |
| nelson | Owner | Semua | admin123 |
| hambali | Owner | Semua | admin123 |
| masir | Owner | Semua | admin123 |
| dr | Owner | Semua | admin123 |
| bw | Owner | Semua | admin123 |
| du_sgb | DU | SGB | admin123 |
| dk_sgb | DK | SGB | admin123 |
| du_rfb | DU | RFB | admin123 |
| dk_rfb | DK | RFB | admin123 |
| du_bpf | DU | BPF | admin123 |
| dk_bpf | DK | BPF | admin123 |
| du_kpf | DU | KPF | admin123 |
| dk_kpf | DK | KPF | admin123 |
| du_ewf | DU | EWF | admin123 |
| dk_ewf | DK | EWF | admin123 |

---

## Appendix B: Environment Variables

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| DATABASE_URL | Ya | Connection string PostgreSQL |
| SESSION_SECRET | Ya (prod) | Secret untuk session encryption |
| SESSION_SECURE | Tidak | Override cookie secure flag (true/false) |
| VAPID_PUBLIC_KEY | Tidak* | VAPID public key untuk push notification |
| VAPID_PRIVATE_KEY | Tidak* | VAPID private key |
| VAPID_EMAIL | Tidak* | Email kontak untuk VAPID |
| NODE_ENV | Tidak | Environment (production/development) |

*Wajib jika fitur push notification diaktifkan.
