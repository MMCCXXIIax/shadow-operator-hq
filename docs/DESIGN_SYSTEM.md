# Shadow Operator HQ — Design System

The single authoritative reference for how this product looks, feels, and gets built. Merges the process/philosophy from [`FRONTEND_UI_PLAYBOOK.md`](../FRONTEND_UI_PLAYBOOK.md) (full detail there) with the concrete color and type tokens implemented in `artifacts/lead-tracker/src/index.css` (source of truth for actual values — this doc explains and contextualizes them, the CSS file is what ships).

Use this doc for: any new screen, the Resend email templates, and anything else touching the product's surface. If this doc and the CSS ever disagree, the CSS wins — update this doc to match.

---

## 1. Product identity

**Shadow Operator HQ is a unified CRM for operators who run both creator outreach and sales pipeline out of the same head, and refuse to lose track of either.** It's for someone juggling Instagram DM campaigns and a sales pipeline simultaneously — cold outreach with warm follow-ups layered on top, where a dropped thread is a lost deal. The product should feel precise and a little urgent: dense enough to scan a pipeline at a glance, but never cold or generic. Every follow-up is a promise the app keeps automatically so the operator doesn't have to remember to.

This is a **productivity/business tool** in the playbook's classification: information density and clarity first, but with a real, deliberate color choice — never the gray/white "wireframe" default the playbook calls out as a failure state.

---

## 2. Workflow — non-negotiable order of operations

Per the playbook, this order applies to every remaining stage of this project (follow-up UI components, Resend, PostHog, anything after):

1. **Plan the product surface** — pages, data entities, API endpoints, including any "wow" read-only endpoints (dashboard aggregates, summaries) beyond flat CRUD.
2. **Write/update the OpenAPI spec first.** `lib/api-spec/openapi.yaml` is the contract. Nothing downstream starts before this is right.
3. **Run codegen.** `pnpm --filter @workspace/api-spec run codegen` — never hand-write fetch calls or re-type response shapes.
4. **Only then build the UI**, using the generated hooks exclusively.
5. Backend implementation happens **in parallel** with frontend work, not before it.

See §2 and §6 of the playbook for the full reasoning — the short version is that this eliminates an entire category of frontend/backend drift bugs by making the contract the first artifact, not the last.

---

## 3. Design philosophy — quick reference

Full detail in the playbook (§3, §7). The load-bearing rules:

- **Identity before pixels.** The one-line sentence in §1 above should be traceable in every visual decision — color, density, copy tone.
- **Color is a decision, never a default.** Plain white/gray is a wireframe, not a finished screen.
- **Motion is core, not garnish.** Page transitions, save/delete/complete feedback, staggered list entrances, and hover states are part of the design, not an afterthought.
- **Supporting screens get equal care.** Login, empty states, error states, and settings are designed as deliberately as the dashboard — a polished dashboard behind a generic login page is a tell of superficial polish.
- **Empty/loading/error states are top-tier surfaces.** Every empty state answers: what is this, why does it matter, what do I do next. Loading states are skeletons shaped like the real content, not generic spinners.
- **Information density matches the user's role.** This is a productivity tool — dense, scannable tables and stat tiles are correct here, not spacious/minimal.
- **Reserve saturated color for meaning.** In a data-dense tool, bold color should signal something (success, overdue, primary action) — not decorate.

---

## 4. Color system

Implemented in `artifacts/lead-tracker/src/index.css` as HSL custom properties (the CSS file is the source of truth — values below are for reference and for contexts, like email, that can't consume CSS variables).

| Token | HSL | Hex (≈) | Intent |
|---|---|---|---|
| `--primary` | `243 75% 59%` | `#4F46E5` | **Deep Blue/Indigo.** Primary brand color — buttons, links, active nav state, focus rings. Constant across light/dark mode. |
| `--accent` / `--success` | `160 84% 39%` | `#059669` | **Teal/Emerald.** Reserved for "Today" / positive / in-progress emphasis — success toasts, "Won" pipeline status, call-booked = Yes, completed follow-ups. `--accent` and `--success` are the same value, kept as separate tokens so component intent stays legible in code (`text-accent` for UI chrome vs. `text-success` for a semantic outcome). |
| `--destructive` | `348 83% 58%` | `#ED3B5F` | **Crisp Red.** Errors, deletions, overdue follow-ups. Never decorative. Constant across light/dark mode. |
| `--secondary` / `--muted` | `210 40% 96.1%` (light) | `#F1F5F9` | Slate/subtle — low-emphasis surfaces and secondary actions. |

**Why these three and not more:** the playbook's own case-study section (§7.6) warns against the "rainbow dashboard" — reserve saturated/branded color for meaning, keep everything else neutral. Indigo carries the brand, teal carries "good news," red carries "needs attention now." That's the whole vocabulary.

**Chart palette** (`--chart-1` through `--chart-5`): indigo, teal, gold (`43 74% 66%`), orange (`27 87% 67%`), red — brand colors first, supporting warm tones for additional series, ending on red for negative/lost segments (e.g. a "lost" slice in a pipeline-status chart).

**Dark mode:** only neutral surfaces (background, foreground, card, border, muted) shift between light and dark. Primary, accent/success, and destructive are identical in both modes — the brand should be recognizable regardless of theme.

**One deliberate exception:** the sidebar's hover state (`--sidebar-accent`) stays a subtle dark-slate elevation rather than the bold teal accent. The sidebar is persistent chrome, not content — letting it use the same saturated teal as in-content success states would compete with them and dilute the signal.

---

## 5. Typography

| Font | Role | Weights in use |
|---|---|---|
| **Inter** | Body copy, UI labels, form inputs, dense data/tables — the workhorse. Legible at small sizes, which matters for the leads table and stat tiles. | 400, 500, 600, 700 |
| **Plus Jakarta Sans** | Headings and display text only (`h1`–`h6`, applied automatically via `--font-display` in `@layer base`). Gives the brand a distinctive voice without touching legibility-critical body text. | 500, 600, 700, 800 |

Both are loaded via Google Fonts in `artifacts/lead-tracker/index.html`. Three weights (Regular/Medium, SemiBold, Bold) cover the large majority of real UI needs — resist adding more per the playbook's typography guidance (§7.6).

---

## 6. Spacing & shape

- Base radius: `0.5rem` (8px), scaled via `--radius-sm/md/lg/xl` for smaller/larger elements.
- The "elevate" system (`hover-elevate`, `active-elevate-2` utility classes, defined at the bottom of `index.css`) is the standard way to add hover/active feedback — it automatically computes a contrast-appropriate overlay rather than requiring a hand-picked color per component. Prefer it over ad-hoc `hover:bg-*` classes for consistency.

---

## 7. For email templates (Resend)

Email clients can't read CSS custom properties, so use the hex values from the table in §4 directly in template markup/inline styles:

- Primary actions / links: `#4F46E5`
- Positive confirmation (e.g. the "Won" congrats email): `#059669`
- Urgency (overdue follow-ups in the daily digest): `#ED3B5F`
- Body text: Inter, falling back to standard sans-serif (`font-family: 'Inter', -apple-system, sans-serif`) — don't rely on the Google Fonts `<link>`, most email clients strip it. Headings can attempt `'Plus Jakarta Sans', sans-serif` with the same fallback, but keep it optional — email typography support is inconsistent enough that Inter-or-fallback everywhere is the safer default.
- Keep templates plain/minimal per the product decision already made for this stage — the color and type system above should read as "this is Shadow Operator HQ," not carry a full visual redesign into email.

---

## 8. Where things live

- `artifacts/lead-tracker/src/index.css` — implementation (source of truth for values)
- `FRONTEND_UI_PLAYBOOK.md` (repo root) — full process and philosophy detail
- This file — the merged quick reference; update it if the CSS changes
