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

## Demo Login
- superadmin1 / admin123
- owner1 / admin123
- du_sgf / admin123
- dk_sgf / admin123

## Database
- PostgreSQL via DATABASE_URL
- Schema push: `npm run db:push`
- Auto-seed pada startup jika database kosong
