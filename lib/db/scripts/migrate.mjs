// Applies the checked-in SQL migrations in lib/db/migrations in filename order,
// recording each one in the schema_migrations table so it only ever runs once.
//
// Why this exists: `drizzle-kit push` is the project's dev workflow, but push is
// not a record of anything and its `--force` flag can silently drop data. Any
// change that matters gets a numbered .sql file here so it is reviewable,
// replayable and non-destructive.
//
//   DATABASE_URL=... node ./scripts/migrate.mjs
//
// Each migration runs inside a transaction together with its bookkeeping row, so
// a failure leaves the database untouched.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set to run migrations.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log(`Migrations: up to date (${files.length} applied).`);
  }

  for (const file of pending) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Migrations: applying ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Migrations: applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`${file} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
} finally {
  await client.end();
}
