import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL harus tersedia");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 4 * 60 * 1000,
  keepAlive: true,
  connectionTimeoutMillis: 15000,
});

// Cegah crash proses saat koneksi idle diputus oleh database (mis. Neon menutup
// koneksi idle). Tanpa listener ini, error socket pada client idle menjadi
// uncaught exception yang mematikan seluruh server lalu memicu restart.
pool.on("error", (err) => {
  console.error("[db] Kesalahan pada koneksi idle pool (ditangani, server tetap jalan):", err.message);
});

export const db = drizzle(pool, { schema });
