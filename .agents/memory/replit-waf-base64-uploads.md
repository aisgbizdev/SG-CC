---
name: Replit edge WAF blocks base64 in request bodies
description: Why image/file uploads that embed base64 data URIs in a JSON request body fail with 403 in production on Replit deployments, and the fix.
---

On Replit deployments, the edge proxy/WAF can return a generic `403 Forbidden`
HTML page (NOT JSON) for requests whose body contains a `data:...;base64,...`
string. It is content-based, not size-based: a body as small as ~25KB was
blocked. Dev (no WAF) works fine, so it only reproduces in production.

**How to recognize it:**
- Browser console: `PATCH/POST .../api/... 403 (Forbidden)` with an HTML
  `<!doctype html>...403 Forbidden` body (Express returns JSON, so HTML = proxy).
- Deployment logs show the origin never gets the body:
  `BadRequestError: request aborted`, `ECONNABORTED`, `received: 0` — the edge
  blocked it and aborted the upstream connection. Small JSON requests (no base64)
  to the same route return 200.

**Why:** the WAF flags base64 / `data:` URI payloads in request bodies as
suspicious, independent of size.

**How to apply / fix:** never send file/image uploads as a base64 string inside
a JSON body. Send the file as raw binary instead — e.g. POST the Blob with its
image content-type and parse it server-side with `express.raw({ type: () => true })`,
then build the `data:` URL on the server before storing. Responses containing
data URLs are fine (WAF inspects requests, not responses), so storing avatars as
data-URL text columns still works.
