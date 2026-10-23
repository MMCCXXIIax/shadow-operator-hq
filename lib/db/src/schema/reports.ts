import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanJobsTable } from "./scans";
import { leadsTable } from "./leads";
import { usersTable } from "./auth";

// A report can only ever be in one of two states. `complete` is written only
// after the report contract validates every section against owned evidence.
export const scanReportStatuses = ["incomplete", "complete"] as const;
export type ScanReportStatus = (typeof scanReportStatuses)[number];

// One row per (scan job, attempt). Retrying a scan increments
// `scan_jobs.attempt`, so a new attempt gets its own row and earlier attempts
// are preserved rather than overwritten.
//
// The JSON columns are validated by lib/api-zod/src/report.ts before they are
// written; the column types stay `unknown` so the report contract has exactly
// one definition and the database layer does not duplicate it.
export const scanReportsTable = pgTable(
  "scan_reports",
  {
    id: serial("id").primaryKey(),
    scanJobId: integer("scan_job_id")
      .notNull()
      .references(() => scanJobsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),

    status: text("status", { enum: scanReportStatuses }).notNull().default("incomplete"),

    // Provenance of the process that produced these sections. `not_run` and
    // `unavailable` are honest states, never a stand-in for a real provider.
    generator: text("generator").notNull(),
    generatorVersion: text("generator_version").notNull(),

    sections: jsonb("sections").notNull(),
    limitations: jsonb("limitations").notNull().default([]),
    blockedBy: jsonb("blocked_by"),

    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("scan_reports_scan_attempt_uidx").on(table.scanJobId, table.attempt),
    index("scan_reports_user_id_idx").on(table.userId),
    index("scan_reports_lead_id_idx").on(table.leadId),
  ],
);

export const insertScanReportSchema = createInsertSchema(scanReportsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScanReport = z.infer<typeof insertScanReportSchema>;
export type ScanReport = typeof scanReportsTable.$inferSelect;
