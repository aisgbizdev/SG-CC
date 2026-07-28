---
name: Service worker must be served no-cache
description: Why sw.js and index.html must have no-cache headers, and how a broken SW bricks the app
---

# Service worker cache headers (SG Control Center)

## Rule
`sw.js` and `index.html` MUST be served with `Cache-Control: no-cache, no-store, must-revalidate`
(done in `server/static.ts` via `express.static({ setHeaders })` + the index.html fallback).
Register with `navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })` then `reg.update()`.

## Why
A previous `sw.js` had a `fetch` handler that did `event.respondWith(fetch(...))` on navigations with
**no fallback** and cached assets. Symptoms in production: first load fine, then blank/dark screen (app
theme bg) with spinner on subsequent clicks — and the server saw NO request for `/` because the stuck
old SW intercepted the navigation and hung it. Deadlock: the hung navigation never reaches
`window.load`, so the page never re-registers the fixed SW → the broken SW stays forever.

Serving `sw.js` without no-cache made it worse: browsers kept the stale (broken) SW script and never
fetched the fixed one. no-cache lets the browser's automatic SW update check always pull fresh bytes;
combined with `skipWaiting()` + `clients.claim()` in the new SW, the fixed version takes over.

## How to apply
- Keep the SW push-only (push + notificationclick handlers). NEVER add a `fetch` handler that
  intercepts navigations without a network fallback.
- Any SW change only reaches production after a REBUILD + republish: vite copies `client/public/sw.js`
  to `dist/public/sw.js`, and prod serves the built `dist`. Verify `head dist/public/sw.js` after build —
  a stale `dist` can ship the OLD SW even though the source is fixed.
- The new SW's `activate` deletes all old caches (e.g. `sgcc-v1`) so stale cached assets stop serving.
