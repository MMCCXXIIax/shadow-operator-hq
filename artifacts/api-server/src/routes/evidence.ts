import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, evidenceItemsTable, leadsTable, type EvidenceItem } from "@workspace/db";
import {
  ListLeadEvidenceParams,
  ListLeadEvidenceResponse,
  CreateLeadEvidenceParams,
  CreateLeadEvidenceBody,
  GetEvidenceItemParams,
  GetEvidenceItemResponse,
  UpdateEvidenceItemParams,
  UpdateEvidenceItemBody,
  UpdateEvidenceItemResponse,
  DeleteEvidenceItemParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/route-auth";

function serializeEvidence(item: EvidenceItem) {
  return {
    ...item,
    capturedAt: item.capturedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// The creator must belong to the signed-in user. Evidence is never accepted for
// a lead id taken on trust from the client.
async function ownedLeadExists(leadId: number, userId: string): Promise<boolean> {
  const [lead] = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.userId, userId)));
  return Boolean(lead);
}

const router: IRouter = Router();

router.get("/leads/:id/evidence", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = ListLeadEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await ownedLeadExists(params.data.id, userId))) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  const items = await db
    .select()
    .from(evidenceItemsTable)
    .where(and(eq(evidenceItemsTable.leadId, params.data.id), eq(evidenceItemsTable.userId, userId)))
    .orderBy(desc(evidenceItemsTable.capturedAt), desc(evidenceItemsTable.id));

  res.json(ListLeadEvidenceResponse.parse(items.map(serializeEvidence)));
});

router.post("/leads/:id/evidence", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = CreateLeadEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateLeadEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await ownedLeadExists(params.data.id, userId))) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  const [item] = await db
    .insert(evidenceItemsTable)
    .values({ ...parsed.data, leadId: params.data.id, userId })
    .returning();

  // Same shape as GET /evidence/:id (orval emits no separate create-response schema).
  res.status(201).json(GetEvidenceItemResponse.parse(serializeEvidence(item)));
});

router.get("/evidence/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = GetEvidenceItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(evidenceItemsTable)
    .where(and(eq(evidenceItemsTable.id, params.data.id), eq(evidenceItemsTable.userId, userId)));

  if (!item) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  res.json(GetEvidenceItemResponse.parse(serializeEvidence(item)));
});

router.patch("/evidence/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = UpdateEvidenceItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEvidenceItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(evidenceItemsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(evidenceItemsTable.id, params.data.id), eq(evidenceItemsTable.userId, userId)))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  res.json(UpdateEvidenceItemResponse.parse(serializeEvidence(item)));
});

router.delete("/evidence/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = DeleteEvidenceItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(evidenceItemsTable)
    .where(and(eq(evidenceItemsTable.id, params.data.id), eq(evidenceItemsTable.userId, userId)))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
