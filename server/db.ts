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

export const db = drizzle(pool, { schema });
