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

## Delete/Archive
- Soft-delete via `isArchived: true` (activities, cases, tasks)
- List and detail queries filter `isArchived: false` automatically
- Delete buttons on list cards (trash icon) and detail pages (red "Hapus" button)
- AlertDialog confirmation before delete
- Permissions: Aktivitas/Kasus - creator OR owner OR superadmin; Tugas - superadmin/owner only
- Company access check enforced on task deletion for owners

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

## Pagination Component
- `client/src/components/data-pagination.tsx` - Reusable pagination UI + `usePagination` hook
- Used on: aktivitas, kasus, tugas, pengumuman, notifikasi, pesan pages
- Shows "Halaman X dari Y (N data)" info

## Database
- PostgreSQL via DATABASE_URL
- Schema push: `npm run db:push`
- Auto-seed pada startup jika database kosong
