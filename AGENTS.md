# Shadow Operator HQ — Base44 Dev Environment

## Quick start
```
docker compose -f docker-compose.base44.yml up -d --build
```
Preview is on port 3000.

## Architecture
- **Frontend** (`artifacts/lead-tracker`): Vite + React dev server on port 3000. Calls `/api/*` with relative URLs + cookies. A Vite proxy (gated on `API_PROXY_TARGET` env var) forwards `/api` to the Express server so cookies stay same-origin.
- **API** (`artifacts/api-server`): Express 5 on port 8080. Email/password auth with bcrypt + session cookies stored in Postgres. The `dev` script builds with esbuild then runs the bundle — **not live-reload**; restart the `api` service after API code changes (`docker compose -f docker-compose.base44.yml restart api`).
- **DB**: PostgreSQL 16. Schema pushed via `drizzle-kit push` in a one-shot `migrate` compose service that runs before `api` starts.

## Compose services
- `db` — PostgreSQL (healthcheck: `pg_isready`)
- `install-deps` — one-shot `pnpm install --frozen-lockfile` (gates all other app services)
- `migrate` — one-shot `drizzle-kit push` (depends on db + install-deps)
- `api` — Express server (depends on migrate completing)
- `web` — Vite dev server on port 3000 (depends on api healthy)

## Env vars
- `DATABASE_URL` — set inline in compose (local Postgres creds, not a secret)
- `PORT` / `BASE_PATH` — required by Vite (set in compose)
- `API_PROXY_TARGET` — set to `http://api:8080` in compose; enables the Vite proxy
- No external service credentials needed — auth is local bcrypt-based

## Key gotchas
- The `minimumReleaseAge: 1440` setting in `pnpm-workspace.yaml` checks npm registry publication dates. With `--frozen-lockfile` this is skipped.
- The API server's `dev` script is `build && start` (esbuild bundle, no watch). To pick up API changes: `docker compose -f docker-compose.base44.yml restart api` then `reload_preview`.
- `Dockerfile.base44` is a thin layer on `node:24-slim` that installs pnpm — source is bind-mounted at runtime, not baked in.
- The `/leads/stats` route must be registered before `/leads/:id` in Express (already handled in the code).
