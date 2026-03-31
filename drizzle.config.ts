import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Default SSL on (for Neon/production). Allow override with DRIZZLE_SSL=false for local Postgres.
const ssl =
  process.env.DRIZZLE_SSL === "false"
    ? false
    : true;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Neon requires SSL; explicit flag avoids timeout when sslmode is ignored
    ssl,
  },
});
