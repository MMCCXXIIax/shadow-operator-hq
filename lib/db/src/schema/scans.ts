import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { usersTable } from "./auth";

// A scan is the persistent record of one "Analyze Creator" submission. It holds
// the stage list as it actually ran, so a blocked or failed scan can be inspected
// and resumed instead of disappearing with the request.
export const scanJobStatuses = ["queued", "running", "blocked", "failed", "completed"] as const;
export type ScanJobStatus = (typeof scanJobStatuses)[number];

// The approved workflow's stages, in order. Kept here so the runner, the API and
// the UI agree on the same vocabulary.
export const scanStageKeys = [
  "resolve_profile",
  "collect_evidence",
  "analyze_signals",
  "monetization_gap",
  "product_concepts",
  "outreach_draft",
  "report_ready",
] as const;
export type ScanStageKey = (typeof scanStageKeys)[number];

export const scanStageStatuses = ["pending", "running", "done", "failed", "skipped"] as const;
export type ScanStageStatus = (typeof scanStageStatuses)[number];

export interface ScanStageState {
  key: ScanStageKey;
  label: string;
  status: ScanStageStatus;
  // Why this stage ended the way it did. Never a substitute for missing data.
  detail?: string | null;
}

export const scanJobsTable = pgTable(
  "scan_jobs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    // NULL until a creator record is identified or reused.
    leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "cascade" }),

    input: text("input").notNull(),
    normalizedHandle: text("normalized_handle").notNull(),

    status: text("status", { enum: scanJobStatuses }).notNull().default("queued"),
    currentStage: text("current_stage", { enum: scanStageKeys }),
    stages: jsonb("stages").$type<ScanStageState[]>().notNull(),

    // Typed blocker, e.g. `instagram_not_configured`, so the UI can explain it.
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attempt: integer("attempt").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("scan_jobs_user_id_idx").on(table.userId),
    index("scan_jobs_lead_id_idx").on(table.leadId),
    index("scan_jobs_user_handle_idx").on(table.userId, table.normalizedHandle),
  ],
);

export const insertScanJobSchema = createInsertSchema(scanJobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScanJob = z.infer<typeof insertScanJobSchema>;
export type ScanJob = typeof scanJobsTable.$inferSelect;
