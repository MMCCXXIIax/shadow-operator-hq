# AGENTS.md — Shadow Operator HQ (pnpm workspace)

Findings that aren't obvious from the manifests. Read `replit.md` for the product/stack overview.

## Running the app here (Base44 sandbox / Docker)

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

| Service | What it does |
| --- | --- |
| `db` | `postgres:16`, dev credentials `app/app/app`, volume `db-data` |
| `setup` | one-shot: `pnpm install --frozen-lockfile`, then checked-in SQL migrations (`@workspace/db run migrate`), then a **non-forced** `drizzle-kit push` (must exit 0 before the apps start) |
| `api` | `pnpm --filter @workspace/api-server run dev` (Express on `:8080`), built by esbuild |
| `web` | `pnpm --filter @workspace/lead-tracker run dev` (Vite, published on host `:3000`) |

Non-obvious bits:

- The repo itself has **no** compose file that runs from source — `docker-compose.base44.yml` is the only dev-from-source stack.
- The whole workspace is bind-mounted at `/app`; dependencies live in `/app/node_modules` (installed by `setup`, not baked into an image). Re-run `docker compose -f docker-compose.base44.yml up -d --force-recreate setup` (or just `up -d`) after changing a `package.json`/lockfile.
- `pnpm` is installed at container start (`npm i -g pnpm@10`); the workspace pins no `packageManager`, so keep it in sync with the lockfile's `lockfileVersion: '9.0'`.
- `.pnpm-store/` appears in the workspace root at runtime (pnpm's store on a mounted volume) and is gitignored.
- The API needs `DATABASE_URL` and **fails fast** without it (`lib/db/src/index.ts`). Schema must be pushed before the API is useful, hence the `setup` service.
- Auth is entirely local (email + password, bcrypt, sessions in Postgres) — no external identity provider or API keys, so the stack runs with no secrets.
- The browser talks to a **single origin** on `:3000`. `artifacts/lead-tracker/vite.config.ts` proxies `/api` to the API service when `BASE44_PREVIEW_MODE=1` and `API_PROXY_TARGET` is set (wired in the compose file); outside that combination the config is unchanged. Without the proxy, sign-in/leads calls 404 because the frontend always fetches relative `/api/...` URLs.
- Frontend edits hot-reload (Vite). The API has no watcher: `docker compose -f docker-compose.base44.yml restart api` after backend edits (its `dev` script esbuild-bundles then starts).

## Builds and checks

```bash
pnpm run typecheck        # tsc for libs + all artifacts
pnpm run build            # typecheck, then vite/esbuild builds for all artifacts
pnpm -r --if-present run build   # what the root build script runs per package
```

- The root build includes **three** Vite apps: `artifacts/lead-tracker`, `artifacts/mockup-sandbox` (design playground, not part of the CRM UI) and the esbuild bundle for `artifacts/api-server`. A failure in any one fails the workspace build — which is what a deployment build runs, so it must stay green.
- `artifacts/*/vite.config.ts` read `PORT` and `BASE_PATH`. They are set by the Replit dev workflows only, so the configs **fall back to defaults** (`5173`/`5174`, base `/`) rather than throwing when a plain build runs without them.
- `pnpm --filter <name>` works both with the package name (`@workspace/db`) and the directory name (`db`); `scripts/post-merge.sh` relies on the latter.

## Schema changes

- Anything that matters gets a numbered file in `lib/db/migrations/` (currently `0001_evidence_items.sql`, `0002_scan_jobs.sql`). `lib/db/scripts/migrate.mjs` applies them in filename order, each in a transaction with its `schema_migrations` row, so a failure leaves the DB untouched and a rerun is a no-op.
- `setup` runs migrations **before** `drizzle-kit push`. `push` is non-forced here on purpose: a destructive drift must stop the setup service instead of dropping data. Never use `push-force` (or `drizzle-kit push --force`) against this database.
- To add one: write the next `NNNN_name.sql`, restart setup — `docker compose -f docker-compose.base44.yml run --rm --no-deps setup` — and check the log line `Migrations: applied …`.
- Tables managed outside Drizzle (e.g. `bookkeeping_*`) are deliberately absent from the Drizzle schema; a plain `push` will offer to drop them. Leave them out of `lib/db/src/schema/`.

## Verifying a change

1. `docker compose -f docker-compose.base44.yml ps` — `db` healthy, `setup` exited 0, `api`/`web` healthy.
2. `curl -s localhost:3000/` returns the app shell, `curl -s localhost:3000/api/healthz` returns `{"status":"ok"}` through the Vite proxy.
3. In the browser: the signed-out landing page renders; signing up (the app's own form) leads to the "Command Center" dashboard with the first-run tour, and `/leads` lists leads. Accounts are created through the UI — there is no seed data, and every lead is owned by its creator.
   - Signup is **closed as soon as one account exists** (`/api/auth/signup-availability` is true only while `users` is empty or `ALLOWED_SIGNUP_EMAILS` lists the address). So signed-in screens can only be checked automatically through a replayed preview session; otherwise verify the signed-out landing page and report the rest as not automatically verified.
4. The creator detail page (`/leads/:id`) opens with the Evidence card, directly under the page header (`artifacts/lead-tracker/src/components/evidence-section.tsx`): "Add evidence" opens a dialog, the trash icon opens an AlertDialog that must be confirmed before `DELETE /api/evidence/:id` fires. Deleting the creator removes its evidence.
5. `pnpm run build` must exit 0 (run it in a container: `docker compose -f docker-compose.base44.yml run --rm --no-deps --entrypoint sh setup -c "npm i -g pnpm@10 >/dev/null && cd /app && pnpm run build"`).
6. Recovery path: `scripts/db-backup.sh` writes a gzipped dump; `scripts/db-restore.sh <dump> --verify-only` loads it into a throwaway `shadowos_restore_check` database, prints row counts and drops it, so the drill never touches live data. Restoring over the live `app` database is manual on purpose — see the script header.

## Creator Intelligence Scan (orchestration only — no research adapter yet)

`POST /api/scans` takes one handle or profile URL, normalizes it (`lib/instagram/handle.ts`), persists a `scan_jobs` row and runs the seven approved stages, writing each transition to `scan_jobs.stages` (jsonb). `GET /api/scans`, `GET /api/scans/:id`, `POST /api/scans/:id/retry`.

- **It cannot produce a report yet, by design.** There is no Instagram/Meta data source and no AI provider, so stage 1 (`resolve_profile`) fails with `instagram_not_configured` and stages 2–7 are recorded as `skipped`. The UI shows that blocker and the missing env names — never a fabricated or partial report.
- Stage 1 does run one real, local step: it reuses an existing creator (`leads` row owned by the same user, matched case-insensitively on `instagram_handle`) so a scan never duplicates a creator record. `leads.instagram_user_id` + its partial unique index `(user_id, instagram_user_id)` is where the stable account id will land once resolution is real.
- `GET /api/instagram/status` reports only whether `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` are **present**. Never return their values.
- The runner is in-process (`lib/scan/runner.ts`), started after the HTTP response; it persists its own failures, so nothing is left stuck in `running`. Retry resets the stage list and increments `attempt`.
- Business Discovery cannot return third-party comment text — only captions and like/comment counts. Any Audience Signals section has to say so rather than invent comments.
- To exercise the signed-in screens by hand, set `ALLOWED_SIGNUP_EMAILS` on the `api` service, create a throwaway account through the app's own form, then **remove the variable and delete that user** (`delete from users where email = …` cascades to its sessions, leads, evidence and scans).
