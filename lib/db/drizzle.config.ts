import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  // `schema_migrations` is bookkeeping owned by scripts/migrate.mjs, not part of
  // the Drizzle schema. Without this filter `push` sees it as an unmanaged table
  // and offers to drop it (data loss).
  tablesFilter: ["!schema_migrations"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
