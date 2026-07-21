---
name: Production slowness — cold start & payload lessons
description: Why SGCC felt slow in production and the fixes that must not be reverted
---

Rule: never block server listen on long startup DB work when deployed on autoscale. Startup migrations/seed run fire-and-forget in production, with an `/api` gate middleware that holds requests until seeding finishes, plus a sentinel query that skips ~40 migration statements when already applied.

**Why:** Autoscale cold starts made every first visitor wait for ~40 sequential remote-DB (Neon) statements before the port even opened; simple queries also showed ~1s latency from cold DB connections.

**How to apply:** Any new startup work (migrations, verification, seeding) must go inside `seedData()` (gated) — never as a new top-level await before `listen`. Add new migration statements BEFORE updating the sentinel check in `migrationsAlreadyApplied()` or bump the sentinel to a marker the new migration creates.

Other perf decisions to keep:
- gzip via `compression()` middleware in server/index.ts.
- `getUsers`/`getUsersByCompany` exclude `avatarUrl` (base64 blobs) at SQL level and return `avatarUrl: null`; list UIs show initials for other users. Full avatar only via /api/auth/me, /api/profile, getUser(id).
- Splash screen hides on React mount (`window.__hideSplash` from main.tsx), 5s fallback — don't reintroduce fixed delays.

Known issue: `.env` with real secrets (DATABASE_URL, SESSION_SECRET, JWT_SECRET, VAPID private key) is tracked in git despite .gitignore. Needs `git rm --cached` (destructive — user/task approval) + secret rotation.
