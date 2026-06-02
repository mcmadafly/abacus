import { defineConfig } from "drizzle-kit";

// We only use drizzle-kit to GENERATE migration SQL from the schema.
// Migrations are applied to D1 via `wrangler d1 migrations apply` (see apps/web).
export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/schema.ts",
  out: "./migrations",
});
