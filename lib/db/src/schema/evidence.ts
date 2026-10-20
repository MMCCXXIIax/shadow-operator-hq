import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { usersTable } from "./auth";

// What kind of thing the evidence is. Deliberately limited to things a human
// operator can capture from public pages or from the creator directly.
export const evidenceTypes = [
  "public_bio",
  "public_post",
  "visible_metric",
  "audience_question",
  "creator_provided",
  "other",
] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

// Provenance. An operator entering something they saw is NOT the same as a
// verified fact, so every record must say which one it is.
//   unverified      — captured by the operator, not independently checked
//   creator_stated  — the creator told us this (not independently checked)
//   verified        — the operator re-checked the source and it holds
//   disputed        — a source contradicts this record
export const evidenceVerificationStatuses = [
  "unverified",
  "creator_stated",
  "verified",
  "disputed",
] as const;
export type EvidenceVerificationStatus = (typeof evidenceVerificationStatuses)[number];

// How the evidence was retrieved, so provenance stays auditable.
export const evidenceRetrievalMethods = [
  "manual_entry",
  "screenshot",
  "creator_message",
  "api",
  "other",
] as const;
export type EvidenceRetrievalMethod = (typeof evidenceRetrievalMethods)[number];

export const evidenceItemsTable = pgTable(
  "evidence_items",
  {
    id: serial("id").primaryKey(),
    // The creator this evidence is about. `leads` remains the canonical
    // creator record — this is a reference, not a new creator table.
    leadId: integer("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
    // Owner. Always derived from the session on the server, never from the client.
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

    evidenceType: text("evidence_type", { enum: evidenceTypes }).notNull(),

    sourceUrl: text("source_url"),
    sourceDescription: text("source_description"),

    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    content: text("content").notNull(),

    verificationStatus: text("verification_status", { enum: evidenceVerificationStatuses })
      .notNull()
      .default("unverified"),
    retrievalMethod: text("retrieval_method", { enum: evidenceRetrievalMethods })
      .notNull()
      .default("manual_entry"),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("evidence_items_lead_id_idx").on(table.leadId),
    index("evidence_items_user_id_idx").on(table.userId),
  ],
);

export const insertEvidenceItemSchema = createInsertSchema(evidenceItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;
export type EvidenceItem = typeof evidenceItemsTable.$inferSelect;
