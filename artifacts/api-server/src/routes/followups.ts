import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, followUpsTable, leadsTable } from "@workspace/db";
import { GetLeadFollowupsParams, CompleteFollowupParams, GetLeadFollowupsResponse, ListFollowupsResponse, CompleteFollowupResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/route-auth";
import { getStartOfDay, getEndOfDay } from "../lib/followups";

const router: IRouter = Router();

const FOLLOWUP_SELECT = {
  id: followUpsTable.id,
  leadId: followUpsTable.leadId,
  userId: followUpsTable.userId,
  scheduledDate: followUpsTable.scheduledDate,
  status: followUpsTable.status,
  dayOffset: followUpsTable.dayOffset,
  completedAt: followUpsTable.completedAt,
  leadName: leadsTable.name,
  leadCompany: leadsTable.company,
  leadEmail: leadsTable.email,
  leadInstagramHandle: leadsTable.instagramHandle,
};

router.get("/leads/:id/followups", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = GetLeadFollowupsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const leadId = params.data.id;

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.userId, userId)));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const fups = await db
    .select(FOLLOWUP_SELECT)
    .from(followUpsTable)
    .innerJoin(leadsTable, eq(followUpsTable.leadId, leadsTable.id))
    .where(eq(followUpsTable.leadId, leadId))
    .orderBy(followUpsTable.scheduledDate);

  res.json(GetLeadFollowupsResponse.parse(fups));
});

router.get("/followups", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const now = new Date();
  const todayStart = getStartOfDay(now);
  const todayEnd = getEndOfDay(now);

  const allFollowUps = await db
    .select(FOLLOWUP_SELECT)
    .from(followUpsTable)
    .innerJoin(leadsTable, eq(followUpsTable.leadId, leadsTable.id))
    .where(and(eq(followUpsTable.userId, userId), eq(followUpsTable.status, "pending")))
    .orderBy(followUpsTable.scheduledDate);

  const overdue = allFollowUps.filter((f) => f.scheduledDate < todayStart);
  const today = allFollowUps.filter((f) => f.scheduledDate >= todayStart && f.scheduledDate <= todayEnd);
  const upcoming = allFollowUps.filter((f) => f.scheduledDate > todayEnd);

  res.json(ListFollowupsResponse.parse({ overdue, today, upcoming }));
});

router.patch("/followups/:id/complete", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = CompleteFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [fup] = await db
    .update(followUpsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(followUpsTable.id, params.data.id), eq(followUpsTable.userId, userId)))
    .returning();

  if (!fup) {
    res.status(404).json({ error: "Follow-up not found" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, fup.leadId));

  res.json(
    CompleteFollowupResponse.parse({
      ...fup,
      leadName: lead?.name ?? null,
      leadCompany: lead?.company ?? null,
      leadEmail: lead?.email ?? null,
      leadInstagramHandle: lead?.instagramHandle ?? null,
    }),
  );
});

export default router;
