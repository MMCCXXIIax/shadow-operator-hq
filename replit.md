# Shadow Operator HQ

A unified CRM combining Instagram creator-outreach tracking with sales-pipeline and follow-up management. Merged from two prior apps (AI Shadow Lead Tracker + FollowFlow) into one lead model: every lead carries creator profile fields (niche, handle, priority score, DM status) alongside sales-pipeline status and an auto-generated follow-up schedule.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/lead-tracker run dev` — run the frontend (Vite, port assigned by env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/leads.ts` — Drizzle leads table schema
- `artifacts/api-server/src/routes/leads.ts` — leads CRUD + stats routes
- `artifacts/lead-tracker/src/` — React frontend (Dashboard, Leads table, Lead detail, New lead form)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `docs/DESIGN_SYSTEM.md` — authoritative design reference (colors, type, philosophy, workflow order)
- `FRONTEND_UI_PLAYBOOK.md` — full frontend process/philosophy detail

## Architecture decisions

- Contract-first: OpenAPI spec drives both Zod validation (server) and React Query hooks (client)
- Stats endpoint (`GET /leads/stats`) returns real aggregated data — niche breakdown, DM status funnel, pipeline status breakdown, avg priority
- Leads table supports multi-filter queries: search, niche, dmStatus, callBooked, status, minPriority, maxPriority
- `leads.userId` is NOT NULL — every lead is explicitly owned by its creator from creation. There is no seed data and no unowned-lead claiming.
- Creating a lead auto-generates 5 follow-ups at day offsets 0, 3, 7, 11, 14 (see `FOLLOW_UP_OFFSETS` in `artifacts/api-server/src/routes/leads.ts`)

## Product

- Dashboard: Combined pipeline health + follow-up urgency — total leads, calls booked, avg priority score, niche distribution, DM/status funnels, plus overdue/today/upcoming follow-ups
- Leads Pipeline: Searchable, filterable table of all leads with status badges and priority scores
- Lead Detail: Creator profile fields, DM/call status, in-place editing, and the lead's follow-up schedule with mark-complete buttons — all in one page
- New Lead: Form to add new leads (name required; creator-profile fields optional)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every spec change: `pnpm --filter @workspace/api-spec run codegen`
- DB push uses: `pnpm --filter @workspace/db run push`
- The `/leads/stats` route MUST be registered before `/leads/:id` in Express to avoid the param matching it

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Before building any new screen or UI, read `docs/DESIGN_SYSTEM.md` — it's the merged design reference (palette, typography, philosophy) and points to the full playbook for process detail. Follow the spec → codegen → UI workflow order it documents.
