import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        // sw.js dan index.html TIDAK boleh di-cache: browser harus selalu
        // mengambil versi terbaru. Kalau sw.js ter-cache, service worker lama
        // yang rusak tetap terpasang di browser pengguna dan bikin halaman
        // blank/muter walau sudah republish.
        if (base === "sw.js" || base === "index.html") {
          res.setHeader(
            "Cache-Control",
            "no-cache, no-store, must-revalidate",
          );
        }
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
