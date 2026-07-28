---
name: Neon idle-connection crash (57P01) killing the VM
description: Why the deployed server crash-looped and the required pool error handler
---

Rule: any `pg.Pool` (node-postgres) talking to Neon MUST have a `pool.on("error", ...)` handler. Without it, Neon periodically terminating idle connections (Postgres error code `57P01`, severity FATAL, "terminating connection due to administrator command") surfaces as an uncaught `'error'` event on the idle client's TLS socket and crashes the whole Node process (exit status 1).

**Why:** On the Reserved VM deployment, the process crash-looped every so often — each crash caused a ~7s restart window where the site returned no response / blank page. Users read this as "the app is slow/broken." Root cause was purely the missing idle-client error listener, not the app code or the data migration.

**How to apply:** Keep the `pool.on("error")` listener in `server/db.ts`. It logs and swallows idle-connection errors so the pool just discards the dead client and opens a new one on next use. Errors on a client that is actively checked out during a query are still delivered to that query's caller (not the pool listener), so this does not hide real query failures. Production runs the bundled `dist/index.cjs`, so a **republish is required** for any db.ts change to take effect — restarting the dev workflow alone does not update production.

Note: the deployment is `vm` (Reserved VM), so there is no autoscale cold start — steady-state is always-on; any "slowness" that comes and goes in bursts points at crash/restart, not cold start.
