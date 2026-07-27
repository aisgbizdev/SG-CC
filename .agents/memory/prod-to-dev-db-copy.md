---
name: Prod→dev DB copy via executeSql
description: How to reliably copy Replit's read-only production DB replica into the dev DB, avoiding durable-runtime write loss.
---

Copying the production database (read-only replica, reachable ONLY via `executeSql environment:"production"` in CodeExecution) into the development database.

**Rule:** never rely on durable `executeSql`/CodeExecution for the *writes* into dev. The durable runtime records callback results and replays them; on a worker disconnect mid-run, "successful" writes are replayed from cache and never hit the DB. Symptom: a loop reports "processed 52" but a later fresh count shows only ~5 landed.

**Reliable pattern:**
1. Reads from prod → local files, via durable CodeExecution. Idempotent: skip a file if its size already equals prod's `octet_length`. This survives replay/disconnect because file writes are real and re-writing the same bytes is harmless.
2. Writes into dev → `psql` / node-`pg` in ShellExec (non-durable, actually persists). Load JSON row dumps with `INSERT ... OVERRIDING SYSTEM VALUE SELECT (jpr).* FROM (SELECT json_populate_record(null::<table>, j) ...)` — the `OVERRIDING SYSTEM VALUE` is required because id columns are GENERATED ALWAYS AS IDENTITY. `SET session_replication_role = replica` to defer FK checks during load, then `setval(pg_get_serial_sequence(...))` to fix sequences.

**Reading large text/bytea from prod:** `executeSql` truncates big single-cell reads. Max reliable read ≈ 350–400K chars per `substr(col, off, n)` call; verify each read's decoded byte length against `octet_length(convert_to(substr(...),'UTF8'))`. Transfer as base64 (`encode(convert_to(...,'UTF8'),'base64')` with newlines stripped via `translate(..., chr(10)||chr(13), '')`). Keep each CodeExecution call bounded (~12–20MB) or it times out / disconnects.

**Why:** a real case had 233MB of case attachments stored as text (base64 data-URLs) in `cases.case_documents`/`complaint_attachments`; naive DB→DB streaming lost writes and truncated big cells repeatedly.

**How to apply:** verify at the end by comparing prod vs dev `count(*)` per table and per-row `length()` of big columns. Note prod is live — ephemeral tables (notifications, session) drift during the copy; re-pull them last.
