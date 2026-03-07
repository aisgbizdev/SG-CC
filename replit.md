# SG Control Center (SGCC)

Pusat kendali internal grup SG untuk monitoring aktivitas, pengaduan, progress, komunikasi, dan pelaporan level direksi.

## Stack Teknologi
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express
- Database: PostgreSQL (Drizzle ORM)
- Auth: Passport.js (username/password + session)

## Arsitektur
- Multi-company architecture: 1 database, semua tabel menggunakan `company_id`
- Role-based access: superadmin, owner, du (Direktur Utama), dk (Direktur Kepatuhan)
- Bahasa UI: Bahasa Indonesia
- Warna utama: Navy Blue

## Struktur Folder
```
shared/schema.ts    - Database schema + types (Drizzle + Zod)
server/
  index.ts          - Express server entry
  db.ts             - Database connection
  auth.ts           - Passport auth + session
  routes.ts         - API routes
  storage.ts        - Storage layer (CRUD operations)
  seed.ts           - Demo data seeder
client/src/
  App.tsx            - Root app + routing
  lib/auth.tsx       - Auth context + hooks
  lib/queryClient.ts - TanStack Query setup
  components/
    app-sidebar.tsx  - Sidebar navigasi
    ui/              - shadcn components
  pages/
    login.tsx        - Halaman login
    dashboard.tsx    - Dashboard per role
    aktivitas.tsx    - Daftar aktivitas
    aktivitas-detail.tsx - Detail aktivitas + komentar
    kasus.tsx        - Daftar kasus pengaduan
    kasus-detail.tsx - Detail kasus + timeline + komentar
    tugas.tsx        - Daftar tugas
    pengumuman.tsx   - Pengumuman
    pesan.tsx        - Pesan privat
    notifikasi.tsx   - Notifikasi in-app
    pengaturan.tsx   - Ganti password
    users.tsx        - Manajemen user (superadmin)
    companies.tsx    - Daftar perusahaan (clickable cards)
    company-detail.tsx - Detail PT: info, cabang, rekap, pengurus
    kpi.tsx          - Penilaian KPI DU/DK
```

## Modul Utama
1. Dashboard - ringkasan per role
2. Aktivitas - CRUD aktivitas penting DU/DK
3. Kasus Pengaduan - CRUD kasus + timeline + workflow stage
4. Tugas - assignment dari Owner/Superadmin ke DU/DK
5. Pengumuman - broadcast dari Owner/Superadmin
6. Pesan - komunikasi privat
7. Notifikasi - in-app notifications
8. Komentar - thread diskusi pada aktivitas/kasus/tugas
9. Manajemen User - CRUD user (superadmin only)
10. Manajemen PT - detail perusahaan, cabang (CRUD), rekap kasus/aktivitas/tugas/pengumuman, daftar pengurus
11. Penilaian KPI - penilaian kinerja DU/DK per kuartal

## Perusahaan
1. PT Solid Gold Berjangka (SGB)
2. PT Rifan Financindo Berjangka (RFB)
3. PT Best Profit Futures (BPF)
4. PT Kontak Perkasa Futures (KPF)
5. PT Equityworld Futures (EWF)

## Demo Login (password: admin123)
- superadmin (Superadmin)
- nelson / hambali / masir / dr / bw (Owner)
- du_sgb / dk_sgb (DU/DK PT SGB)
- du_rfb / dk_rfb (DU/DK PT RFB)
- du_bpf / dk_bpf (DU/DK PT BPF)
- du_kpf / dk_kpf (DU/DK PT KPF)
- du_ewf / dk_ewf (DU/DK PT EWF)

## PWA (Progressive Web App)
- Manifest: `client/public/manifest.json`
- Service Worker: `client/public/sw.js` (network-first strategy, offline fallback)
- Icons: `client/public/icon-192.png`, `client/public/icon-512.png`
- Splash screen: inline CSS in `client/index.html` (navy gradient, logo pulse animation, auto-fade 1.5s)
- Mobile-optimized: responsive padding (`p-3 sm:p-6`), sidebar drawer on mobile, viewport meta with user-scalable
- Installable: manifest configured with standalone display, maskable icons

## Download/Export
- PDF (jspdf + jspdf-autotable), Excel (xlsx), Word (docx + file-saver)
- `client/src/lib/download.ts` - export utilities
- `client/src/components/download-menu.tsx` - dropdown UI component
- Available on: Aktivitas, Kasus Pengaduan, Tugas pages

## Edit/Delete/Archive
- Inline edit: Edit button (pencil icon) on aktivitas, kasus, pengumuman, and tugas list cards/dialogs opens edit form with pre-filled data
- Edit permissions: Aktivitas/Kasus - creator OR superadmin; Pengumuman - creator OR superadmin (backend requires owner/superadmin role); Tugas - superadmin/owner (full fields: title, description, assignee, company, priority, deadline, notes)
- Edit uses PATCH `/api/activities/:id`, PATCH `/api/cases/:id`, PATCH `/api/announcements/:id`, PATCH `/api/tasks/:id`
- Soft-delete via `isArchived: true` (activities, cases, tasks, announcements)
- List and detail queries filter `isArchived: false` automatically
- Delete buttons on list cards (trash icon) and detail pages (red "Hapus" button)
- AlertDialog confirmation before delete
- Delete permissions: Aktivitas/Kasus - creator OR owner OR superadmin; Tugas - superadmin/owner only; Pengumuman - creator OR superadmin
- Company access check enforced on task deletion for owners

## Pesan (Messages)
- Multi-select recipients with checkbox list UI (not dropdown)
- "Pilih Semua" checkbox to select/deselect all recipients at once
- Shows count of selected recipients in label and send button
- Uses Promise.allSettled for batch send with partial failure handling
- Reports partial success when some messages fail to send

## Security & Performance
- Trust proxy: `app.set("trust proxy", 1)` enabled for correct rate-limit IP detection behind proxy
- Rate limiting: 100 req/min general API, 10 req/min login (express-rate-limit)
- Session: SESSION_SECRET env var required; secure cookies in production
- Error handling: Production 5xx errors return generic message; dev shows details
- Frontend route protection: `/users` and `/companies` only rendered for superadmin role; unknown routes redirect to dashboard
- Database indexes: 22 indexes on frequently queried columns (users, activities, cases, tasks, announcements, notifications, messages, audit_logs)
- Zod validation: All POST/PATCH routes validate request bodies with descriptive error messages
- Database transactions: All multi-step operations (create + audit log, etc.) wrapped in atomic transactions
- Dashboard stats: 10 queries run in parallel via Promise.all for faster load
- Pagination: Client-side pagination (20 items/page) on all list pages; backend supports `?page=1&limit=20` query params
- Response logging: No response body logging (security)

## Dashboard Stat Cards
- 4 stat cards (Total Aktivitas, Kasus Aktif, Tugas Pending, Pengumuman) are clickable — navigate to respective list pages
- Uses `Link` from wouter with hover-elevate effect

## Sorting & Filtering
- Aktivitas: sort by tanggal/prioritas/progress; filter by status/PT/prioritas
- Kasus: sort by tanggal/risiko/progress; filter by risk/PT/bucket/workflow stage
- Tugas: sort by deadline/prioritas/progress; filter by status/prioritas/penerima
- All filters reset pagination to page 1
- Null deadlines always sorted to end

## Navigation
- Back button (ArrowLeft) and Home button appear in header on all pages except dashboard
- Back uses window.history.back() with fallback to `/` if no history
- Home links directly to `/` (dashboard)
- Sidebar logo + "SG Control Center" text is clickable → navigates to `/`

## Error Handling
- `ErrorBoundary` wraps all routes — catches render errors, shows "Terjadi Kesalahan" with full page reload button
- `QueryError` component — reusable error state for failed API queries with "Coba Lagi" retry button
- Used on: dashboard, aktivitas, kasus, tugas, pengumuman, pesan, notifikasi

## Dynamic Page Titles
- Hook: `client/src/hooks/use-page-title.ts` — `usePageTitle(title)` sets `document.title` to "Title | SGCC"
- Applied to all 14 pages including detail pages (dynamic titles)

## Shared Components
- `client/src/components/status-badges.tsx` — StatusBadge and RiskBadge (extracted from dashboard)
- `client/src/components/error-boundary.tsx` — ErrorBoundary class component
- `client/src/components/query-error.tsx` — QueryError for failed API states

## Pagination Component
- `client/src/components/data-pagination.tsx` - Reusable pagination UI + `usePagination` hook
- Used on: aktivitas, kasus, tugas, pengumuman, notifikasi, pesan pages
- Shows "Halaman X dari Y (N data)" info

## Dashboard Stat Cards (Updated)
- 7 stat cards total: 4 operational (biru row atas) + 3 completion (hijau row bawah)
- Row 1: Total Aktivitas, Kasus Aktif, Tugas Pending, Pengumuman
- Row 2: Aktivitas Selesai, Kasus Selesai, Tugas Selesai (with "dari X total" subtitle)

## Penilaian KPI (Dual-Layer System)
- **KPI Live**: skor real-time auto-calculated dari data aktivitas/kasus/tugas
- **KPI Penilaian**: snapshot per periode + catatan coaching dari owner
- 3 tipe periode: Bulanan (YYYY-MM), Kuartal (YYYY-Q#), Tahunan (YYYY)
- 8 aspek penilaian otomatis: Penyelesaian Tugas (15%), Penyelesaian Kasus (20%), Penyelesaian Aktivitas (15%), Ketepatan Waktu (15%), Progress Rata-rata (10%), Responsivitas (10%), Beban Kerja (5%), Konsistensi (10%)
- Grade: A (≥85), B (≥70), C (≥55), D (<55)
- Radar chart SVG untuk visualisasi 8 aspek
- Coaching fields: strengths (kekuatan), improvements (area perbaikan), notes (catatan coaching)
- **Dasar Penilaian**: section collapsible yang menjelaskan rumus, sumber data, bobot, dan grade (di expanded Live & History)
- **Papan Peringkat**: ranking DU/DK berdasarkan skor KPI Live (sorted by totalScore desc), top 3 highlight medali, dinamis berubah mengikuti skor
- Akses: superadmin/owner lihat semua DU/DK; DU/DK hanya lihat KPI sendiri
- API: GET /api/kpi/live, GET /api/kpi/live/:userId, GET /api/kpi, POST /api/kpi, GET /api/kpi/:id
- Frontend: `client/src/pages/kpi.tsx` — route `/kpi` (2 tabs: KPI Live + Riwayat Penilaian)

## Database
- PostgreSQL via DATABASE_URL
- Schema push: `npm run db:push`
- Auto-seed pada startup jika database kosong
