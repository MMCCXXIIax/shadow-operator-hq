import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const leadStatuses = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  // Identity & contact
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),

  // Creator profile (optional — only for creator-outreach leads)
  instagramHandle: text("instagram_handle"),
  // Stable platform account id, recorded once a scan resolves the profile.
  // Uniqueness is per owner (see the partial index below) so a renamed handle
  // cannot create a second creator record.
  instagramUserId: text("instagram_user_id"),
  niche: text("niche"),
  subNiche: text("sub_niche"),
  estFollowers: text("est_followers"),
  profileBioSummary: text("profile_bio_summary"),
  monetizationGap: text("monetization_gap"),

  // Outreach tracking
  priorityScore: integer("priority_score").notNull().default(5),
  dmStatus: text("dm_status").notNull().default("Not Sent"),
  response: text("response"),
  callBooked: text("call_booked").notNull().default("No"),
  notes: text("notes"),

  // Sales pipeline
  status: text("status", { enum: leadStatuses }).notNull().default("new"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("leads_user_instagram_user_id_idx")
    .on(table.userId, table.instagramUserId)
    .where(sql`instagram_user_id IS NOT NULL`),
]);

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
