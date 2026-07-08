import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, lte, or, sql } from "drizzle-orm";
import { db, leadsTable, followUpsTable, type Lead } from "@workspace/db";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
  DeleteLeadParams,
  ListLeadsResponse,
  GetLeadStatsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/route-auth";
import { FOLLOW_UP_OFFSETS, addDays } from "../lib/followups";

function serializeLead(lead: Lead) {
  return {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

const router: IRouter = Router();

router.get("/leads/stats", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const userFilter = eq(leadsTable.userId, userId);

  const totalLeads = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(userFilter);

  const callsBooked = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(userFilter, eq(leadsTable.callBooked, "Yes")));

  const avgPriority = await db
    .select({ avg: sql<number>`avg(priority_score)::float` })
    .from(leadsTable)
    .where(userFilter);

  const nicheBreakdown = await db
    .select({ niche: leadsTable.niche, count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(userFilter)
    .groupBy(leadsTable.niche)
    .orderBy(sql`count(*) desc`);

  const dmStatusBreakdown = await db
    .select({ dmStatus: leadsTable.dmStatus, count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(userFilter)
    .groupBy(leadsTable.dmStatus)
    .orderBy(sql`count(*) desc`);

  const statusBreakdown = await db
    .select({ status: leadsTable.status, count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(userFilter)
    .groupBy(leadsTable.status)
    .orderBy(sql`count(*) desc`);

  const stats = {
    totalLeads: totalLeads[0]?.count ?? 0,
    callsBooked: callsBooked[0]?.count ?? 0,
    avgPriorityScore: Number((avgPriority[0]?.avg ?? 0).toFixed(1)),
    nicheBreakdown: nicheBreakdown.map((r) => ({ niche: r.niche, count: r.count })),
    dmStatusBreakdown: dmStatusBreakdown.map((r) => ({ dmStatus: r.dmStatus, count: r.count })),
    statusBreakdown: statusBreakdown.map((r) => ({ status: r.status, count: r.count })),
  };

  res.json(GetLeadStatsResponse.parse(stats));
});

router.get("/leads", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, niche, dmStatus, callBooked, status, minPriority, maxPriority } = parsed.data;

  const conditions = [eq(leadsTable.userId, userId)];

  if (search) {
    conditions.push(
      or(
        ilike(leadsTable.name, `%${search}%`),
        ilike(leadsTable.instagramHandle, `%${search}%`),
        ilike(leadsTable.niche, `%${search}%`),
        ilike(leadsTable.subNiche, `%${search}%`),
        ilike(leadsTable.profileBioSummary, `%${search}%`),
        ilike(leadsTable.monetizationGap, `%${search}%`),
      )!,
    );
  }
  if (niche) conditions.push(eq(leadsTable.niche, niche));
  if (dmStatus) conditions.push(eq(leadsTable.dmStatus, dmStatus));
  if (callBooked) conditions.push(eq(leadsTable.callBooked, callBooked));
  if (status) conditions.push(eq(leadsTable.status, status));
  if (minPriority != null) conditions.push(gte(leadsTable.priorityScore, minPriority));
  if (maxPriority != null) conditions.push(lte(leadsTable.priorityScore, maxPriority));

  const leads = await db
    .select()
    .from(leadsTable)
    .where(and(...conditions))
    .orderBy(leadsTable.priorityScore);

  res.json(ListLeadsResponse.parse(leads.map(serializeLead)));
});

router.post("/leads", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({ ...parsed.data, userId })
    .returning();

  const now = new Date();
  const followUps = FOLLOW_UP_OFFSETS.map((offset) => ({
    leadId: lead.id,
    userId,
    scheduledDate: addDays(now, offset),
    dayOffset: offset,
    status: "pending" as const,
  }));
  await db.insert(followUpsTable).values(followUps);

  res.status(201).json(GetLeadResponse.parse(serializeLead(lead)));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.userId, userId)));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(GetLeadResponse.parse(serializeLead(lead)));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.userId, userId)))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(UpdateLeadResponse.parse(serializeLead(lead)));
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db
    .delete(leadsTable)
    .where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.userId, userId)))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
