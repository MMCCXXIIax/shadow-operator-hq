# How I Build Good Frontend UIs — A Playbook

This document captures the tech stack, workflow, and design principles used to build FollowFlow's frontend (and frontends in general on this platform). It's written so you can hand it to another AI coding tool (like Claude Code) as a reference for reproducing the same quality bar.

---

## 1. Tech Stack

**Frontend**
- React + Vite (TypeScript)
- Wouter for routing (lightweight alternative to React Router)
- Tailwind CSS for styling
- shadcn/ui-style component primitives (Radix UI underneath) for accessible, unstyled-by-default building blocks
- TanStack Query (`@tanstack/react-query`) for all server-state — no manual `useEffect` + `fetch` data fetching
- A generated, typed API client (via OpenAPI → Orval codegen) — the frontend never hand-writes fetch calls or guesses endpoint shapes

**Backend (for context — shapes what the frontend can build)**
- Express + TypeScript
- JWT-based auth middleware
- Drizzle ORM + PostgreSQL
- Contract-first: an OpenAPI spec is written FIRST, then both the Zod validation schemas (backend) and the React Query hooks (frontend) are code-generated from it. This guarantees the frontend and backend never drift out of sync.

**Monorepo**
- pnpm workspace with shared packages (`lib/db`, `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`) consumed by multiple "artifacts" (apps) — so design tokens, auth, and API contracts are reusable across a product's surfaces (web app, admin panel, marketing site, etc.)

---

## 2. The Workflow — Order of Operations

The order matters more than most people think. Building UI before the contract exists is how you get mismatched types and rework.

1. **Plan the product surface first, not the UI.** Decide the pages/routes, the data entities, and the API endpoints needed — including a few "wow" read-only endpoints beyond flat CRUD (dashboard summaries, activity feeds, aggregates). These small extras are usually the difference between a boring CRUD app and one that feels considered.
2. **Write the OpenAPI spec before any UI code.** This is the contract. It gates everything downstream.
3. **Run codegen.** This produces typed React Query hooks and Zod schemas automatically — no manual API client code, no drift between frontend expectations and backend reality.
4. **Only now build the UI**, using the generated hooks exclusively (never relative fetch calls, never re-typing response shapes by hand).
5. **Backend implementation happens in parallel with frontend work**, not before it — the frontend doesn't need the database to exist yet, only the typed contract.

Why this order: it front-loads the one artifact (the contract) that both sides depend on, so frontend and backend can be built simultaneously instead of sequentially, and eliminates an entire category of integration bugs.

---

## 3. Design Philosophy — What Actually Makes a UI "Good"

These are the actual rules I apply, distilled from my design skill instructions:

### Give every app a real identity before touching pixels
Never design from "a clean dashboard" or "a simple habit tracker." Start from a specific, vivid sentence: who is this for, and what should using it feel like? Example:
- Bad: "A CRM for sales teams."
- Good: "A follow-up tracker for solo salespeople who are drowning in leads and terrified of dropping the ball on a warm one."

The identity sentence changes every downstream decision — color, tone, density, copy.

### Match visual energy to app category
Not every app should look the same. I classify before designing:
- **Presentation-heavy** (landing pages, portfolios): maximum creative risk, bold typography, motion, big swings. Safe = forgettable here.
- **Personal utility** (journals, trackers): warm, crafted, calm — but "calm" must still mean real color, never gray/white emptiness.
- **Consumer/lifestyle** (social, booking, marketplace): needs personality plus usability; micro-interactions carry a lot of the "feel."
- **Productivity/business tools** (dashboards, CRMs, internal tools): information density and clarity first, but still a deliberate color choice and typography pairing — professional should never mean lifeless.

### Color is a decision, never a default
Every app must make a deliberate palette choice derived from its domain and identity. Pure white background + gray text is treated as a wireframe, not a finished product — it's an explicit failure state to avoid, not a safe default.

### Motion and micro-interactions are not optional polish
Smooth page transitions, satisfying feedback on actions (save, delete, complete, favorite), staggered entrance animations for lists, and intentional hover states are treated as core to the design, not garnish added at the end.

### Supporting screens get equal care
Login pages, empty states, error pages, and settings screens are designed with the same intent as the primary dashboard. A gorgeous dashboard behind a generic login page signals the polish is superficial — this is explicitly called out as a mistake to avoid.

### Information density is chosen deliberately, not accidentally
Business/productivity tools should be dense but organized (users want to scan a lot at a glance). Personal/consumer tools should have breathing room. Getting this backwards is a common tell of an unconsidered UI.

---

## 4. How the Work Is Actually Delegated (Process, Not Just Principles)

On this platform, frontend visual work is handled by a specialized design-focused process, separate from backend/product planning. The split works like this:

**The product/planning side owns:**
- What pages exist and why
- What data lives on each page
- What API operations are available

**The design side owns (and should own, full stop):**
- Layout, color, typography, spacing, component choices
- Copy tone and micro-interaction details
- Every visual and structural decision

The critical discipline: the planning side gives a *brief*, not a *spec*. It never says "use a sidebar with cards" or "make it minimal" — it says who the product is for and what it should feel like, and lets the design layer make every visual call. Over-specifying the brief is explicitly called out as producing worse, more generic results than under-specifying it.

**A good brief includes:**
1. A one-line product identity (vivid, specific, not generic)
2. A vibe/feeling described in plain sensory language (not a named design style)
3. Pages/routes with one-line purposes
4. Data types and fields
5. The exact list of available typed API hooks (so integration isn't guesswork)

**A good brief never includes:**
- Prescribed colors, fonts, or named design styles
- Prescribed layout patterns ("sidebar", "cards", "tabs")
- Page section structure ("hero, then features, then testimonials")

This separation is the single highest-leverage habit in the whole process — technical correctness (the brief's data/hooks section) and creative quality (the vibe section) are optimized independently instead of being tangled together.

---

## 5. Concrete Checklist for Any New Page/Feature

- [ ] Does this page have a clear one-line purpose?
- [ ] Is every piece of data on this page backed by a real, typed API call (no mock data, no placeholder text left in production)?
- [ ] Does the color palette feel intentional and traceable to the product's identity?
- [ ] Are loading, empty, and error states designed — not just the happy path?
- [ ] Do primary actions (save, delete, complete, submit) give clear, satisfying feedback?
- [ ] Is information density appropriate for the app category (dense for tools, spacious for personal/consumer apps)?
- [ ] Are supporting screens (auth, settings, empty states) as considered as the main flow?
- [ ] No silent failures — errors should be visible and explicit, never swallowed.

---

## 6. Summary — The "Secret Sauce"

If there's one thing to take away: **separate the contract from the craft.**
- The contract (data shapes, routes, API hooks) is planned rigorously and generated, not hand-typed, so integration bugs disappear.
- The craft (visual design) is given room to make bold, specific, identity-driven decisions instead of being boxed in by someone else's layout opinions.

Most mediocre UIs come from mixing these two: a planner who also dictates "use a card grid with a blue theme," producing something generic because the visual decision-maker was constrained before they started. Give the craft real freedom, anchored only by a vivid identity sentence and a real technical contract underneath it.

---

## 7. Wisdom From Top SaaS, Fintech, and Consumer Products

This section distills recurring patterns from the products widely regarded as design benchmarks — Stripe, Linear, Notion, Vercel, Figma, Attio, Ramp, Mercury, Airtable, HubSpot, Intercom, Retool, Cash App, Robinhood, Dropbox, Mailchimp, Canva, Ahrefs, ConvertKit, ClickUp, Slack, Superhuman, and dozens of others studied across landing pages, pricing pages, dashboards, navigation systems, and onboarding flows. These are patterns, not templates — apply the underlying principle to your product's own identity, never copy a layout wholesale.

### 7.1 Landing pages

**The 5-second test governs everything above the fold.** A visitor decides to stay or leave before they've consciously "read" anything. Your hero must answer three questions instantly: *What does it do? Who is it for? Why does it matter?* If a visitor has to scroll to find out what your product does, you've already lost them.

- **Headlines**: short (well under 15 words), outcome-focused, specific. "Welcome to our platform" wastes the visitor's attention; "Never drop a warm lead again" spends it. Avoid generic category language ("the all-in-one platform for...") in favor of a concrete outcome.
- **Hero visuals show the real product**, not stock photography or an abstract illustration. The worst common mistake is the "dashboard dump" — cramming the entire UI into one hero screenshot. Zoom into a single real workflow that proves value in one glance. Linear's homepage is the clearest example: it's a continuous walkthrough of real product UI, dark mode, with real-looking data — no illustrations at all.
- **Modular sections for multiple audiences.** Stripe sells to developers and CFOs simultaneously by building distinct modular sections for each, rather than averaging the messaging into something that satisfies neither. If your product has more than one buyer persona, give each its own section instead of one generic pitch.
- **Trust signals compound.** Recognizable customer logos, concrete numbers (not "thousands of users" — "12,000 sales teams"), and specific outcomes outperform vague claims of quality.
- **Treat the landing page as a living asset**, not a one-time artifact — the best sites rewrite sections as positioning sharpens, the same way you'd refactor code.

### 7.2 Pricing pages

- **The rule of three**: three tiers with the middle tier positioned as the obvious best value (often visually highlighted with a "Most Popular" badge or a colored border) is the single most consistent pattern across Notion, Mailchimp, Airtable, and Ahrefs. A very cheap or very expensive anchor tier makes the middle tier look reasonable by comparison — this is deliberate, not accidental.
- **One-sentence value prop per tier**, above the price, answering "who is this plan for" (Intercom does this well: each tier states a persona, not just a feature list).
- **A generous free tier is a growth lever, not a cost center**, when the product benefits from network effects or habitual use (Notion, Figma, Canva). A tight, low-limit free tier works better for tools with clear expansion revenue paths (Airtable, Ramp).
- **Interactive pricing** (seat sliders, usage calculators, monthly/annual toggles) reduces the cognitive load of "which plan is right for me" and is worth the engineering cost once a product has usage-based dimensions.

### 7.3 Dashboards — information density is a strategic decision, not an aesthetic one

The single most important lesson from comparing Attio, Ramp, and Mercury: **density should be calibrated to the user's role, not to a house visual style.** Ramp and Attio serve finance/ops professionals who want to scan large tables fast — high density is correct there. Mercury serves founders who check their balance once a day — a sparse, calm view is correct there. Applying the wrong density to the wrong user is a bigger failure than any color or spacing choice.

Concrete tactics used by data-dense products (Attio's "precision grid" is the reference example):
- **Tabular numerals** (`font-variant-numeric: tabular-nums`) so numeric columns stay visually aligned — a small detail that makes a dense table feel engineered rather than thrown together.
- **Small, bold, all-caps labels** for metadata/tags so they're scannable without competing with primary content.
- **Soft pastel status pills** with bold text for pipeline/stage indicators — legible at a glance, not another wall of plain text.
- **A record/detail sidebar overlay** rather than full page navigation, so users can inspect one item without losing their place in the list.
- **Multiple interchangeable views** (grid/kanban/list) over the same underlying data, letting different users work the way they think.
- **Subtle layering**: a slightly tinted background separates chrome/navigation from the working surface; cards get a near-invisible border or shadow instead of a heavy outline.

### 7.4 Navigation & information architecture

- **Left sidebars dominate B2B SaaS** because they scale with feature growth in a way horizontal navigation cannot, and because users already have the pattern internalized from Slack, Notion, Linear, and Figma. Default to a sidebar for any tool expected to grow in surface area over the next year.
- **Structure the sidebar top-to-bottom by frequency of use**: workspace/identity switcher at the top, global actions (search, primary create action) next, then the main navigation tree, then account/settings at the bottom. Notion's sidebar follows this exact order.
- **Progressive disclosure** (accordion/expandable sections) lets an IA scale to many items without overwhelming a first-time user — show the top-level categories by default, let usage reveal the depth.

### 7.5 Empty, loading, and error states are a top-tier design surface, not an afterthought

This is one of the highest-ROI, most commonly neglected surfaces in SaaS products. The data backs this up hard: a large share of SaaS users churn within their first week specifically because they got stuck at a moment with no clear next step — often a blank screen with no guidance. Products with a deliberate first-run empty state and onboarding checklist see meaningfully higher activation than the industry norm.

- Every empty state should answer three questions: **What is this? Why does it matter? What should I do next?** A bare "No data found" fails all three.
- The **first-time dashboard empty state is the highest-stakes screen in the entire product** — it's the moment a new user decides whether the product is worth continuing with. It deserves as much design attention as your marketing hero.
- Distinguish the four empty-state types and design each differently: first-use/onboarding (drive the first action), user-cleared (celebrate/redirect — "inbox zero" should feel like a win, not a void), no-results (suggest a fix, e.g. "clear filters"), and error (explain plainly, offer a retry).
- Loading states should reflect the actual shape of the content that's coming (skeleton screens matching the real layout), not a generic spinner — this is what makes a product feel fast even when a network call is slow.

### 7.6 Color and typography systems

- **Color strategy should be legible from a distance, not just "on brand."** Robinhood deliberately avoided the "rainbow dashboard" pattern common in fintech, reserving color almost entirely for gain/loss states against a mostly monochrome UI — this makes the meaningful signal (are you up or down) impossible to miss. Cash App does the opposite deliberately: bold, expressive, near-neon color as the entire brand identity, because their audience and positioning reward personality over restraint. Both are "good design" — for their specific product identity. The mistake is copying either without knowing which one your product actually is.
- **Reserve saturated/branded color for meaning, not decoration**, in data-dense or financial products: green/red for gain/loss, one accent color for primary actions, everything else neutral. This is what makes color-coding trustworthy instead of noisy.
- **A common, reliable typography pairing**: a slightly more distinctive/geometric typeface for display and headings (brand voice), paired with a highly legible, neutral workhorse typeface (Inter is the de facto standard here) for body copy, UI labels, and — critically — dense data/tables, where legibility at small sizes matters more than personality. Three font weights (Regular, Medium, SemiBold/Bold) cover the large majority of real UI needs; resist the urge to introduce more.

### 7.7 The meta-pattern across all of it

Every product studied here made **deliberate, legible trade-offs matched to a specific user and role** — not a generic pursuit of "clean" or "modern." The craft isn't in picking a trendy color or font; it's in correctly diagnosing who the user is in a given moment (a CFO scanning a table vs. a founder checking a balance vs. a first-time visitor deciding whether to sign up) and designing specifically for that moment's actual need. When building or reviewing any screen, ask: *who exactly is looking at this, what do they need from it in the next 5 seconds, and does this screen answer that faster than a generic version would?*
